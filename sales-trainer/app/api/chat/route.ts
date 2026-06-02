import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { openrouter } from '@/lib/ai/openrouter'
import { modelFor } from '@/lib/ai/models'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60

const RequestSchema = z.object({
  session_id: z.string().uuid(),
  messages: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(['user', 'assistant']),
      parts: z.array(z.object({ type: z.string() }).passthrough()),
    }),
  ),
})

function textFromMessage(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim()
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response('Não autorizado.', { status: 401 })
  }

  const body: unknown = await request.json()
  const result = RequestSchema.safeParse(body)

  if (!result.success) {
    return new Response('Dados inválidos.', { status: 400 })
  }

  const { session_id, messages } = result.data
  const uiMessages: UIMessage[] = messages.map((message, index) => ({
    id: message.id ?? `${session_id}-${index}`,
    role: message.role,
    parts: message.parts as UIMessage['parts'],
    metadata: {},
  }))

  const modelMessages = await convertToModelMessages(uiMessages)

  const { data: sessionRaw, error: sessionError } = await supabase
    .from('training_sessions')
    .select('id, seller_id, status, customer_profile_id, behavior_style_id, difficulty_level, chosen_objective')
    .eq('id', session_id)
    .eq('seller_id', user.id)
    .eq('status', 'active')
    .single()

  if (sessionError || !sessionRaw) {
    return new Response('Sessão não encontrada ou encerrada.', { status: 404 })
  }

  const session = sessionRaw as {
    id: string
    customer_profile_id: string
    behavior_style_id: string | null
    difficulty_level: 'easy' | 'medium' | 'hard' | null
    chosen_objective: string | null
  }

  const { data: profileRaw } = await supabase
    .from('customer_profiles')
    .select('system_prompt, chat_model, company_id, customer_id')
    .eq('id', session.customer_profile_id)
    .single()

  const profile = profileRaw as { system_prompt: string; chat_model: string | null; company_id: string | null; customer_id: string | null } | null
  const systemPrompt = profile?.system_prompt
  if (!systemPrompt) {
    return new Response('Perfil não encontrado.', { status: 404 })
  }

  // Base de conhecimento da empresa — injetada em runtime (sempre atualizada)
  // Limite de 20k chars para não ultrapassar o context window do modelo
  const MAX_KNOWLEDGE_CHARS = 20_000
  let knowledgePrompt = ''
  if (profile.company_id) {
    const { data: knowledgeDocs } = await supabase
      .from('company_knowledge_docs')
      .select('title, extracted_text')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (knowledgeDocs?.length) {
      let knowledgeBody = ''
      for (const doc of knowledgeDocs) {
        if (!doc.extracted_text) continue
        const chunk = `--- ${doc.title} ---\n${doc.extracted_text}\n\n`
        if (knowledgeBody.length + chunk.length > MAX_KNOWLEDGE_CHARS) break
        knowledgeBody += chunk
      }
      if (knowledgeBody) {
        knowledgePrompt = `\n\n== BASE DE CONHECIMENTO DA EMPRESA ==\nUse as informações abaixo para enriquecer suas respostas quando relevante. Não cite explicitamente este bloco para o participante.\n\n${knowledgeBody}`
      }
    }
  }

  // Histórico de relacionamento do seller com este cliente — injetado em runtime
  let historyPrompt = ''
  if (profile.customer_id) {
    const { data: historyRaw } = await supabase
      .from('seller_customer_history')
      .select('history_text')
      .eq('seller_id', user.id)
      .eq('customer_id', profile.customer_id)
      .maybeSingle()
    if (historyRaw?.history_text) {
      historyPrompt = `\n\n== HISTÓRICO DE RELACIONAMENTO DO VENDEDOR COM ESTE CLIENTE ==\n${historyRaw.history_text}\nConsidere este histórico para dar continuidade ao relacionamento de forma coerente.`
    }
  }

  // Objetivo escolhido pelo seller na criação da sessão
  const objectiveLabels: Record<string, string> = {
    conquistar: 'Conquistar este cliente (primeiro negócio)',
    aumentar_vendas: 'Aumentar o volume de vendas com este cliente',
    melhorar_relacionamento: 'Melhorar o relacionamento e a confiança',
    reconquistar: 'Reconquistar um cliente perdido ou inativo',
    outro: 'Objetivo não especificado pelo vendedor',
  }
  const objectivePrompt = session.chosen_objective
    ? `\n\n== OBJETIVO DECLARADO PELO PARTICIPANTE ==\nO vendedor está visitando com o seguinte objetivo: ${objectiveLabels[session.chosen_objective] ?? session.chosen_objective}. Use isso para calibrar o que revelará ao longo da conversa e como reagirá às abordagens.`
    : ''

  let behaviorPrompt = ''
  if (session.behavior_style_id) {
    const { data: behaviorStyleRaw } = await supabase
      .from('behavior_styles')
      .select('name, description, simulation_guidance, evaluation_criteria')
      .eq('id', session.behavior_style_id)
      .single()

    const behaviorStyle = behaviorStyleRaw as {
      name: string
      description: string
      simulation_guidance: string
      evaluation_criteria: string | null
    } | null

    if (behaviorStyle) {
      behaviorPrompt = '\n\n' + [
        '== ESTILO COMPORTAMENTAL SORTEADO PARA ESTA SIMULACAO ==',
        `Estilo: ${behaviorStyle.name}`,
        `Descricao: ${behaviorStyle.description}`,
        `Como interpretar esse estilo: ${behaviorStyle.simulation_guidance}`,
        behaviorStyle.evaluation_criteria
          ? `Como avaliar adequacao ao estilo: ${behaviorStyle.evaluation_criteria}`
          : null,
        'Nao revele ao participante qual estilo foi sorteado. Demonstre o estilo apenas pelo comportamento do cliente.',
      ]
        .filter(Boolean)
        .join('\n')
    }
  }

  const difficultyLabels: Record<string, string> = {
    easy: 'Fácil — comprador mais receptivo, poucas objeções',
    medium: 'Médio — objeções moderadas, cético mas aberto',
    hard: 'Difícil — muito cético, exige argumentação sólida',
  }
  const difficultyPrompt = session.difficulty_level
    ? `\n\n== DIFICULDADE ESCOLHIDA PELO PARTICIPANTE ==\nNivel de dificuldade inicial: ${difficultyLabels[session.difficulty_level]}. Ajuste dinamicamente conforme a aderencia do vendedor.`
    : ''

  const lastUserMessage = uiMessages.at(-1)
  const lastUserMessageText =
    lastUserMessage?.role === 'user' ? textFromMessage(lastUserMessage) : ''

  if (lastUserMessageText) {
    await supabase.from('messages').insert({
      session_id,
      role: 'user',
      content: lastUserMessageText,
    })
  }

  const model = profile.chat_model ?? modelFor('chat')

  const streamResult = streamText({
    model: openrouter(model),
    system: `${systemPrompt}${knowledgePrompt}${historyPrompt}${behaviorPrompt}${difficultyPrompt}${objectivePrompt}`,
    messages: modelMessages,
    maxOutputTokens: 1000,
    onFinish: async ({ text, usage }) => {
      await Promise.all([
        supabase.from('messages').insert({
          session_id,
          role: 'assistant',
          content: text,
          tokens: usage.outputTokens,
          model_used: model,
        }),
        supabase.rpc('increment_session_tokens', {
          p_session_id: session_id,
          p_tokens: usage.totalTokens ?? usage.outputTokens ?? 0,
        }),
      ])
    },
  })

  return streamResult.toUIMessageStreamResponse({
    originalMessages: uiMessages,
  })
}

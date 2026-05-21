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
    .select('id, seller_id, status, customer_profile_id, behavior_style_id, difficulty_level')
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
  }

  const { data: profileRaw } = await supabase
    .from('customer_profiles')
    .select('system_prompt, chat_model')
    .eq('id', session.customer_profile_id)
    .single()

  const profile = profileRaw as { system_prompt: string; chat_model: string | null } | null
  const systemPrompt = profile?.system_prompt
  if (!systemPrompt) {
    return new Response('Perfil não encontrado.', { status: 404 })
  }

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
      behaviorPrompt = [
        '',
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
    system: `${systemPrompt}${behaviorPrompt}${difficultyPrompt}`,
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

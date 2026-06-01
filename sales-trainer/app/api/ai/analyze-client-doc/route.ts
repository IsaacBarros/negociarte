import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { openrouter } from '@/lib/ai/openrouter'
import { modelFor } from '@/lib/ai/models'

export const runtime = 'nodejs'
export const maxDuration = 60

const FIELDS = ['business_profile', 'pain_objections', 'relationship_history'] as const
type ClientDocField = (typeof FIELDS)[number]

const RequestSchema = z.object({
  entity_id: z.string().uuid(),
  field: z.enum(FIELDS),
  extracted_text: z.string().min(10).max(150_000),
})

const PROMPTS: Record<ClientDocField, string> = {
  business_profile: `Você é um analista de inteligência comercial. Analise o documento abaixo e extraia, de forma concisa e estruturada em markdown, as informações mais relevantes sobre o perfil de negócio deste cliente B2B. Foque em:
- Segmento e porte da empresa
- Produto ou serviço principal / proposta de valor
- Situação de mercado (crescimento, pressão, transformação)
- Contexto de compra (orçamento habitual, ciclo de decisão, stakeholders)
- Dados concretos que um vendedor usaria para personalizar a abordagem

Seja direto. Use tópicos curtos. Máximo 400 palavras.`,

  pain_objections: `Você é um especialista em vendas consultivas. Analise o documento abaixo e extraia, de forma concisa e estruturada em markdown, as dores e objeções mais relevantes deste cliente B2B. Foque em:
- Principais dores operacionais, estratégicas ou financeiras
- Objeções típicas levantadas (preço, timing, concorrente, status quo)
- Sinais de urgência ou falta dela
- Gatilhos emocionais e racionais que motivam ou bloqueiam a compra

Seja direto. Use tópicos curtos. Máximo 400 palavras.`,

  relationship_history: `Você é um analista de CRM. Analise o documento abaixo e extraia, de forma concisa e estruturada em markdown, o histórico de relacionamento com este cliente B2B. Foque em:
- Interações anteriores (reuniões, propostas, negociações)
- Nível de confiança e relacionamento atual
- Compromissos assumidos ou pendentes
- Aprendizados de tentativas anteriores (o que funcionou e o que não funcionou)
- Próximos passos naturais com base no histórico

Seja direto. Use tópicos curtos. Máximo 400 palavras.`,
}


export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof requireAdmin>>
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos.', issues: parsed.error.issues }, { status: 400 })
  }

  const { entity_id, field, extracted_text } = parsed.data

  const supabase = await createClient()

  // Verificar ownership
  const { data: customer } = await supabase
    .from('scenario_customers')
    .select('id')
    .eq('id', entity_id)
    .eq('organization_id', user.organization_id)
    .single()
  if (!customer) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  // Gerar análise estruturada
  let structuredText: string
  try {
    const { text } = await generateText({
      model: openrouter(modelFor('suggestion')),
      messages: [
        { role: 'system', content: PROMPTS[field] },
        { role: 'user', content: `DOCUMENTO:\n\n${extracted_text}` },
      ],
    })
    structuredText = text.trim()
  } catch (e) {
    console.error('[analyze-client-doc] IA falhou:', e)
    return NextResponse.json({ error: 'Falha ao processar com IA.' }, { status: 500 })
  }

  // Salvar resultado no banco (campos explícitos para satisfazer o TypeScript)
  const updateData =
    field === 'business_profile'
      ? { business_profile_text: structuredText }
      : field === 'pain_objections'
        ? { pain_objections_text: structuredText }
        : { relationship_history_text: structuredText }

  const { error: updateError } = await supabase
    .from('scenario_customers')
    .update(updateData)
    .eq('id', entity_id)
    .eq('organization_id', user.organization_id)

  if (updateError) {
    console.error('[analyze-client-doc] Erro ao salvar:', updateError)
    return NextResponse.json({ error: 'Erro ao salvar análise.' }, { status: 500 })
  }

  return NextResponse.json({ structured_text: structuredText, chars: structuredText.length })
}

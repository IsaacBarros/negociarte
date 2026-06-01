import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openrouter } from '@/lib/ai/openrouter'
import { modelFor } from '@/lib/ai/models'
import { generateText } from 'ai'
import { z } from 'zod'

const MAX_DOC_TEXT_CHARS = 50_000

const RequestSchema = z.object({
  fieldName: z.string().min(1),
  currentData: z.record(z.string(), z.unknown()),
  docText: z.string().max(MAX_DOC_TEXT_CHARS).optional(),
})

const fieldLabels: Record<string, string> = {
  buyer_role: 'cargo ou papel do comprador',
  industry: 'segmento de mercado da empresa do cenário',
  company_size: 'porte e estrutura da empresa do cenário',
  pain_points: 'principais dores e problemas que o comprador enfrenta',
  objections: 'objeções típicas que o comprador faz a propostas de venda',
  personality_traits: 'traços de personalidade do comprador',
  communication_style: 'estilo de comunicação do comprador',
  product_context: 'produto ou serviço vendido no cenário',
  product_service_description: 'descrição de produto ou serviço da empresa',
  budget_context: 'contexto de orçamento do comprador',
  decision_authority: 'autoridade e processo de decisão do comprador',
  visible_briefing: 'briefing visível ao participante antes da visita',
  visit_objective: 'objetivo da visita comercial',
  success_criteria: 'critérios de sucesso para a visita',
  confidential_context: 'contexto confidencial do cliente que orienta a simulação',
  sales_process_context: 'processo de vendas esperado para avaliação',
  sales_competencies_context: 'competências de vendas que serão avaliadas',
  market_situation: 'situação de mercado do caso',
  competition_context: 'concorrência e alternativas consideradas pelo cliente',
  marketing_strategy: 'estratégia de marketing e posicionamento da empresa',
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profileData || profileData.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  const body: unknown = await request.json()
  const result = RequestSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const { fieldName, currentData, docText } = result.data
  const label = fieldLabels[fieldName] ?? fieldName

  const contextStr = Object.entries(currentData)
    .filter(([k, v]) => v && k !== fieldName)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const prompt = docText
    ? `Analise o documento abaixo e extraia as informações relevantes para preencher o campo "${label}" de um perfil de cliente B2B para simulação de vendas comerciais.${contextStr ? `\n\nContexto já preenchido no perfil:\n${contextStr}` : ''}\n\nDOCUMENTO:\n${docText}\n\nResponda com 2 a 6 frases em português. Apenas o texto do campo, sem prefixos ou explicações.`
    : `Dado o perfil de cliente abaixo, sugira um texto conciso (2-4 frases em português) para descrever os "${label}".\n\nContexto:\n${contextStr || '(nenhum contexto fornecido ainda)'}\n\nResponda apenas com o texto sugerido, sem prefixos ou explicações.`

  const { text } = await generateText({
    model: openrouter(modelFor('suggestion')),
    prompt,
    maxOutputTokens: 400,
  })

  return NextResponse.json({ suggestion: text })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openrouter } from '@/lib/ai/openrouter'
import { modelFor } from '@/lib/ai/models'
import { generateText } from 'ai'
import { z } from 'zod'

const RequestSchema = z.object({
  fieldName: z.string().min(1),
  currentData: z.record(z.string(), z.unknown()),
})

const fieldLabels: Record<string, string> = {
  pain_points: 'principais dores e problemas que o comprador enfrenta',
  objections: 'objeções típicas que o comprador faz a propostas de venda',
  personality_traits: 'traços de personalidade do comprador',
  communication_style: 'estilo de comunicação do comprador',
  budget_context: 'contexto de orçamento do comprador',
  decision_authority: 'autoridade e processo de decisão do comprador',
  visible_briefing: 'briefing visível ao participante antes da visita',
  visit_objective: 'objetivo da visita comercial',
  success_criteria: 'critérios de sucesso para a visita',
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

  const body: unknown = await request.json()
  const result = RequestSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const { fieldName, currentData } = result.data
  const label = fieldLabels[fieldName] ?? fieldName

  const contextStr = Object.entries(currentData)
    .filter(([k, v]) => v && k !== fieldName)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const { text } = await generateText({
    model: openrouter(modelFor('suggestion')),
    prompt: `Dado o perfil de cliente abaixo, sugira um texto conciso (2-4 frases em português) para descrever os "${label}".\n\nContexto:\n${contextStr || '(nenhum contexto fornecido ainda)'}\n\nResponda apenas com o texto sugerido, sem prefixos ou explicações.`,
    maxOutputTokens: 300,
  })

  return NextResponse.json({ suggestion: text })
}

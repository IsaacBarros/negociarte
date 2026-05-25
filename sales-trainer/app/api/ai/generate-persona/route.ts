import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { openrouter } from '@/lib/ai/openrouter'
import { modelFor } from '@/lib/ai/models'

const RequestSchema = z.object({
  context: z.string().min(10).max(2000),
  scenario_type: z.enum(['discovery', 'objection_handling', 'closing']),
  difficulty_level: z.enum(['easy', 'medium', 'hard', 'trainee_choice']),
})

const PersonaSchema = z.object({
  company: z.object({
    name: z.string(),
    industry: z.string(),
    company_size: z.string(),
    product_context: z.string(),
    market_situation: z.string(),
    competition_context: z.string(),
    marketing_strategy: z.string(),
  }),
  customer: z.object({
    name: z.string(),
    buyer_role: z.string(),
    description: z.string(),
    pain_points: z.string(),
    objections: z.string(),
    budget_context: z.string(),
    decision_authority: z.string(),
    personality_traits: z.string(),
    communication_style: z.enum(['Analítico', 'Dominante', 'Influente', 'Integrador', 'Estável']),
  }),
  scenario: z.object({
    visible_briefing: z.string(),
    visit_objective: z.string(),
    success_criteria: z.string(),
    confidential_context: z.string(),
    sales_process_context: z.string(),
    sales_competencies_context: z.string(),
  }),
})

const scenarioLabels: Record<string, string> = {
  discovery: 'descoberta (identificar necessidades e qualificar o cliente)',
  objection_handling: 'contorno de objeções (responder resistências e avançar na negociação)',
  closing: 'fechamento (concluir a venda e formalizar o acordo)',
}

const difficultyLabels: Record<string, string> = {
  easy: 'fácil (cliente receptivo, poucas objeções)',
  medium: 'médio (cliente neutro, algumas resistências)',
  hard: 'difícil (cliente cético, muitas objeções fortes)',
  trainee_choice: 'o aluno escolhe a dificuldade',
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

  const { context, scenario_type, difficulty_level } = result.data

  const { object } = await generateObject({
    model: openrouter(modelFor('suggestion')),
    schema: PersonaSchema,
    prompt: `Você é um especialista em treinamento de vendas B2B. Crie uma persona completa e realista para uma simulação de vendas em português brasileiro.

Contexto fornecido pelo usuário: "${context}"
Tipo de cenário: ${scenarioLabels[scenario_type]}
Nível de dificuldade: ${difficultyLabels[difficulty_level]}

Gere uma persona coerente com os seguintes critérios:
- Todos os campos devem estar em português e ser específicos (evite generalidades)
- A empresa e o cliente devem ser fictícios mas plausíveis para o contexto
- As dores, objeções e personalidade do cliente devem refletir o nível de dificuldade
- O briefing visível deve dar contexto ao vendedor sem revelar informações confidenciais
- O contexto confidencial deve conter motivações e tensões internas do cliente que o vendedor precisará descobrir
- O processo de vendas e as competências devem ser calibrados para o tipo de cenário
- Mantenha consistência interna: os dados da empresa, do cliente e do cenário devem contar a mesma história`,
  })

  return NextResponse.json({ data: object })
}

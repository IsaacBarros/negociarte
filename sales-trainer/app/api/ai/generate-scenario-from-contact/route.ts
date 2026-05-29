import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { openrouter } from '@/lib/ai/openrouter'
import { modelFor } from '@/lib/ai/models'

export const runtime = 'nodejs'
export const maxDuration = 60

const RequestSchema = z.object({
  company_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  behavior_style_id: z.string().uuid(),
  scenario_type: z.string().min(1),
  difficulty_level: z.enum(['easy', 'medium', 'hard', 'trainee_choice']),
})

const ScenarioOutputSchema = z.object({
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
  profile: z.object({
    name: z.string().describe('Nome do cenário (ex: João Silva (Analítico) — Descoberta)'),
    industry: z.string(),
    company_size: z.string(),
    market_situation: z.string().describe('Situação de mercado da empresa do cliente'),
    competition_context: z.string().describe('Concorrentes do vendedor neste contexto'),
    visible_briefing: z.string().describe('O que o vendedor vê antes de entrar na sessão'),
    visit_objective: z.string(),
    success_criteria: z.string(),
    confidential_context: z
      .string()
      .describe('Informações que o avatar sabe mas não revela diretamente'),
    sales_process_context: z.string(),
    sales_competencies_context: z.string(),
  }),
})

const defaultScenarioLabels: Record<string, string> = {
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
  let user: Awaited<ReturnType<typeof requireAdmin>>
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const { company_id, customer_id, behavior_style_id, scenario_type, difficulty_level } = parsed.data
  const supabase = await createClient()

  // Resolver descrição do tipo de cenário (banco > fallback padrão > chave bruta)
  const { data: scenarioTypeRow } = await supabase
    .from('scenario_types')
    .select('label, description')
    .eq('organization_id', user.organization_id)
    .eq('key', scenario_type)
    .maybeSingle()

  const scenarioLabel =
    (scenarioTypeRow as { label: string; description: string } | null)?.description ??
    defaultScenarioLabels[scenario_type] ??
    scenario_type

  // Buscar contexto do projeto (empresa do vendedor) + cliente + estilo em paralelo
  const [{ data: projectCompany }, { data: customer }, { data: behaviorStyle }, { data: knowledgeDocs }] =
    await Promise.all([
      supabase
        .from('scenario_companies')
        .select('name, product_context, marketing_strategy, industry')
        .eq('id', company_id)
        .eq('organization_id', user.organization_id)
        .single(),

      supabase
        .from('scenario_customers')
        .select('name, company_name, buyer_role, business_profile_text, pain_objections_text, relationship_history_text')
        .eq('id', customer_id)
        .eq('organization_id', user.organization_id)
        .single(),

      supabase
        .from('behavior_styles')
        .select('name, description, simulation_guidance')
        .eq('id', behavior_style_id)
        .eq('organization_id', user.organization_id)
        .single(),

      supabase
        .from('company_knowledge_docs')
        .select('title, source_type, extracted_text')
        .eq('company_id', company_id)
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
        .not('extracted_text', 'is', null),
    ])

  if (!customer) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  // Montar base de conhecimento do projeto (max 20k chars)
  const MAX_PROJECT_KB_CHARS = 20_000
  let projectKbContent = ''
  let totalChars = 0
  for (const doc of knowledgeDocs ?? []) {
    if (!doc.extracted_text) continue
    const chunk = `[${doc.source_type.toUpperCase()} — ${doc.title}]\n${doc.extracted_text}\n\n`
    if (totalChars + chunk.length > MAX_PROJECT_KB_CHARS) break
    projectKbContent += chunk
    totalChars += chunk.length
  }

  // Contexto do projeto
  const sellerContext = projectCompany
    ? [
        `Empresa do vendedor: ${projectCompany.name}`,
        projectCompany.industry ? `Setor: ${projectCompany.industry}` : null,
        projectCompany.product_context ? `O que oferece: ${projectCompany.product_context}` : null,
        projectCompany.marketing_strategy ? `Estratégia: ${projectCompany.marketing_strategy}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    : 'Contexto do vendedor não disponível.'

  // Contexto do cliente (documentos PDF)
  const clientContextParts: string[] = [
    `Nome: ${customer.name}`,
    customer.company_name ? `Empresa: ${customer.company_name}` : null,
    customer.buyer_role ? `Cargo: ${customer.buyer_role}` : null,
  ].filter((v): v is string => v !== null)

  if (customer.business_profile_text) {
    clientContextParts.push(`\nPERFIL DO NEGÓCIO:\n${customer.business_profile_text}`)
  }
  if (customer.pain_objections_text) {
    clientContextParts.push(`\nDORES E OBJEÇÕES CONHECIDAS:\n${customer.pain_objections_text}`)
  }
  if (customer.relationship_history_text) {
    clientContextParts.push(`\nHISTÓRICO DE RELACIONAMENTO:\n${customer.relationship_history_text}`)
  }

  const clientContext = clientContextParts.join('\n')

  // Estilo de comportamento
  const styleContext = behaviorStyle
    ? `Estilo: ${behaviorStyle.name}\nDescrição: ${behaviorStyle.description}\n${behaviorStyle.simulation_guidance ? `Orientação de simulação: ${behaviorStyle.simulation_guidance}` : ''}`
    : 'Estilo de comportamento não especificado.'

  const prompt = `Você é um especialista em treinamento de vendas B2B.
Com base nos dados do projeto e do cliente, crie um cenário de simulação de vendas completo e realista em português.

CONTEXTO DO VENDEDOR (empresa que está sendo treinada):
${sellerContext}
${projectKbContent ? `\nBASE DE CONHECIMENTO DO PROJETO (use como fonte primária de contexto sobre o mercado, produto e clientes típicos):\n${projectKbContent}\n---` : ''}

DADOS DO CLIENTE (o comprador que o vendedor vai simular):
${clientContext}

ESTILO DE COMPORTAMENTO DO CLIENTE (como ele se comporta na simulação):
${styleContext}

TIPO DE CENÁRIO: ${scenarioLabel}
DIFICULDADE: ${difficultyLabels[difficulty_level]}

Gere um cenário coerente onde:
- O avatar do cliente incorpora o estilo de comportamento especificado
- As dores e objeções refletem os documentos do cliente e a dificuldade solicitada
- O briefing visível situa o vendedor sem revelar informações confidenciais
- O contexto confidencial inclui motivações internas, pressões e contexto que o vendedor deve descobrir
- Se houver histórico de relacionamento, use-o para enriquecer o contexto e o briefing
- Todos os campos em português, específicos e coerentes com a persona descrita`

  try {
    const { object } = await generateObject({
      model: openrouter(modelFor('suggestion')),
      schema: ScenarioOutputSchema,
      prompt,
    })

    return NextResponse.json({ data: object })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Falha na geração: ${msg}` }, { status: 500 })
  }
}

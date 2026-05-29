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
  contact_name: z.string().min(1).max(255),
  contact_role: z.string().min(1).max(255),
  prospect_company_name: z.string().min(1).max(255),
  prospect_company_description: z.string().max(2000).optional(),
  relationship_history: z.string().max(2000).optional(),
  scenario_type: z.enum(['discovery', 'objection_handling', 'closing']),
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
    name: z.string().describe('Nome do cenário (ex: CFO da TechCorp — Descoberta)'),
    industry: z.string(),
    company_size: z.string(),
    market_situation: z.string().describe('Situação de mercado da empresa do prospect'),
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

  const {
    company_id,
    contact_name,
    contact_role,
    prospect_company_name,
    prospect_company_description,
    relationship_history,
    scenario_type,
    difficulty_level,
  } = parsed.data

  const supabase = await createClient()

  // Buscar contexto do projeto (empresa do vendedor)
  const { data: projectCompany } = await supabase
    .from('scenario_companies')
    .select('name, product_context, marketing_strategy, industry')
    .eq('id', company_id)
    .eq('organization_id', user.organization_id)
    .single()

  // Buscar base de conhecimento da empresa
  const { data: knowledgeDocs } = await supabase
    .from('company_knowledge_docs')
    .select('title, source_type, extracted_text')
    .eq('company_id', company_id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .not('extracted_text', 'is', null)

  const MAX_KNOWLEDGE_CHARS = 30_000
  let knowledgeContent = ''
  let totalChars = 0
  for (const doc of knowledgeDocs ?? []) {
    if (!doc.extracted_text) continue
    const chunk = `[${doc.source_type.toUpperCase()} — ${doc.title}]\n${doc.extracted_text}\n\n`
    if (totalChars + chunk.length > MAX_KNOWLEDGE_CHARS) break
    knowledgeContent += chunk
    totalChars += chunk.length
  }

  const sellerContext = projectCompany
    ? [
        `Empresa do vendedor: ${projectCompany.name}`,
        projectCompany.industry ? `Setor do vendedor: ${projectCompany.industry}` : null,
        projectCompany.product_context
          ? `O que o vendedor oferece: ${projectCompany.product_context}`
          : null,
        projectCompany.marketing_strategy
          ? `Estratégia do vendedor: ${projectCompany.marketing_strategy}`
          : null,
      ]
        .filter(Boolean)
        .join('\n')
    : 'Contexto do vendedor não disponível.'

  const prompt = `Você é um especialista em treinamento de vendas B2B.
Com base nos dados de um contato comercial real, crie um cenário de simulação de vendas completo e realista em português.

CONTEXTO DO VENDEDOR (o que ele oferece):
${sellerContext}
${knowledgeContent ? `\nBASE DE CONHECIMENTO (documentos da empresa do vendedor — use como fonte primária de contexto sobre o mercado, produto e clientes típicos):\n${knowledgeContent}\n---` : ''}
DADOS DO CONTATO:
- Nome: ${contact_name}
- Cargo: ${contact_role}
- Empresa onde trabalha: ${prospect_company_name}
- Perfil do negócio: ${prospect_company_description ?? '(inferir da base de conhecimento acima)'}
${relationship_history ? `- Histórico de relacionamento: ${relationship_history}` : '- Primeiro contato (sem histórico)'}

TIPO DE CENÁRIO: ${scenarioLabels[scenario_type]}
DIFICULDADE: ${difficultyLabels[difficulty_level]}

Gere um cenário coerente onde:
- As dores e objeções do contato refletem o negócio descrito e a dificuldade solicitada
- O briefing visível situa o vendedor sem revelar informações confidenciais
- O contexto confidencial inclui motivações internas, pressões e contexto que o vendedor deve descobrir
- Se houver histórico de relacionamento, use-o para enriquecer o contexto confidencial e o briefing
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

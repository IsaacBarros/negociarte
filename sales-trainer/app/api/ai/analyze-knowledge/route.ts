import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { openrouter } from '@/lib/ai/openrouter'
import { modelFor } from '@/lib/ai/models'
import { z } from 'zod'
import { AnalysisSchema } from '@/lib/schemas/analyze-knowledge'

export const runtime = 'nodejs'
export const maxDuration = 60

const RequestSchema = z.object({
  company_id: z.string().uuid(),
})

// Limite de chars concatenados enviados para o modelo
const MAX_INPUT_CHARS = 80_000

const SYSTEM_PROMPT = `Você é um especialista em treinamento de vendas B2B.
Analise os documentos da empresa fornecidos e extraia informações estruturadas para configurar um simulador de vendas.

Gere:
1. Contexto da empresa (mercado, produtos, estratégia, concorrência)
2. 2-3 personas de compradores B2B típicos deste mercado, com dores, objeções e perfil de decisão
3. 2-3 estilos comportamentais de compradores comuns neste contexto

Baseie-se nas informações dos documentos. Para campos sem informação explícita, gere sugestões coerentes com o setor identificado.
Responda em português.`

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
    return NextResponse.json({ error: 'company_id inválido.' }, { status: 400 })
  }

  const { company_id } = parsed.data
  const supabase = await createClient()

  // Verificar empresa pertence à org do admin
  const { data: company, error: companyError } = await supabase
    .from('scenario_companies')
    .select('id, name')
    .eq('id', company_id)
    .eq('organization_id', user.organization_id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
  }

  // Buscar docs ativos com texto extraído
  const { data: docs, error: docsError } = await supabase
    .from('company_knowledge_docs')
    .select('title, source_type, extracted_text')
    .eq('company_id', company_id)
    .eq('is_active', true)
    .not('extracted_text', 'is', null)

  if (docsError) {
    return NextResponse.json({ error: 'Erro ao buscar documentos.' }, { status: 500 })
  }

  if (!docs || docs.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum documento ativo com texto encontrado.' },
      { status: 422 },
    )
  }

  // Concatenar textos até o limite
  let combinedText = ''
  for (const doc of docs) {
    if (!doc.extracted_text) continue
    const prefix = `\n\n--- ${doc.title} (${doc.source_type.toUpperCase()}) ---\n`
    const remaining = MAX_INPUT_CHARS - combinedText.length - prefix.length
    if (remaining <= 0) break
    combinedText += prefix + doc.extracted_text.slice(0, remaining)
  }

  if (!combinedText.trim()) {
    return NextResponse.json(
      { error: 'Documentos sem conteúdo texto suficiente.' },
      { status: 422 },
    )
  }

  // Análise IA
  try {
    const { object } = await generateObject({
      model: openrouter(modelFor('suggestion')),
      schema: AnalysisSchema,
      system: SYSTEM_PROMPT,
      prompt: `Empresa: ${company.name}\n\nDOCUMENTOS:\n${combinedText}`,
    })

    return NextResponse.json(object)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Falha na análise: ${msg}` }, { status: 500 })
  }
}

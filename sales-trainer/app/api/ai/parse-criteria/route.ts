import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { openrouter } from '@/lib/ai/openrouter'
import { modelFor } from '@/lib/ai/models'
import { generateObject } from 'ai'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 30

const BodySchema = z.object({
  text: z.string().min(10).max(10_000),
  total_points: z.number().int().min(50).max(500).optional().default(200),
})

const BehaviorSchema = z.object({
  key: z.string().regex(/^[a-z_]+$/).describe('Chave snake_case única'),
  label: z.string().describe('Nome legível do comportamento'),
  weight: z.number().int().min(5).max(100).describe('Peso em pontos (múltiplo de 5 recomendado)'),
})

const StageSchema = z.object({
  key: z.string().regex(/^[a-z_]+$/).describe('Chave snake_case única'),
  label: z.string().describe('Nome legível da etapa'),
  behaviors: z.array(BehaviorSchema).min(1).max(8),
})

const CriteriaSchema = z.object({
  name: z.string().describe('Nome do conjunto de critérios (ex: "Processo de Vendas Consultivas")'),
  stages: z.array(StageSchema).min(1).max(10),
})

export async function POST(request: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const { text, total_points } = parsed.data

  const { object } = await generateObject({
    model: openrouter(modelFor('suggestion')),
    schema: CriteriaSchema,
    prompt: `Você é um especialista em treinamento de vendas B2B e avaliação de desempenho.

Analise o processo de vendas descrito abaixo e crie uma estrutura de critérios de avaliação para simular e pontuar o desempenho de vendedores.

TOTAL DE PONTOS DISPONÍVEIS: ${total_points}

PROCESSO DE VENDAS:
${text}

Regras:
- Organize em etapas lógicas (stages) que representem fases da venda
- Dentro de cada etapa, liste comportamentos mensuráveis (behaviors)
- A soma dos weights de todos os behaviors deve ser exatamente ${total_points}
- Chaves devem ser snake_case, únicas, sem acentos
- Labels devem ser em português, claros e objetivos
- Foque em comportamentos observáveis, não em intenções`,
    maxOutputTokens: 1500,
    temperature: 0.2,
  })

  // Normalizar pesos para que a soma seja exatamente total_points
  const allBehaviors = object.stages.flatMap((s) => s.behaviors)
  const rawTotal = allBehaviors.reduce((sum, b) => sum + b.weight, 0)
  if (rawTotal !== total_points && rawTotal > 0) {
    const factor = total_points / rawTotal
    for (const stage of object.stages) {
      for (const behavior of stage.behaviors) {
        behavior.weight = Math.round(behavior.weight * factor)
      }
    }
    // Ajustar arredondamentos no último behavior
    const adjustedTotal = object.stages.flatMap((s) => s.behaviors).reduce((s, b) => s + b.weight, 0)
    const diff = total_points - adjustedTotal
    const lastStage = object.stages.at(-1)
    const lastBehavior = lastStage?.behaviors.at(-1)
    if (lastBehavior) lastBehavior.weight += diff
  }

  return NextResponse.json({ criteria: { ...object, total_points } })
}

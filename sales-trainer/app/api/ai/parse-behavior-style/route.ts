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
})

const BehaviorStyleSchema = z.object({
  name: z.string().describe('Nome curto do estilo (ex: "Analítico", "Dominante")'),
  description: z.string().describe('Descrição do perfil comportamental em 2-3 frases'),
  simulation_guidance: z.string().describe(
    'Instruções detalhadas para a IA interpretar este estilo durante a simulação (ex: como o cliente reage, tom, ritmo, o que valoriza)',
  ),
  evaluation_criteria: z.string().describe(
    'Critérios para avaliar a adequação do vendedor a este estilo durante a sessão',
  ),
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

  const { text } = parsed.data

  const { object } = await generateObject({
    model: openrouter(modelFor('suggestion')),
    schema: BehaviorStyleSchema,
    prompt: `Você é um especialista em comportamento de compra B2B e treinamento de vendas.

Com base no texto abaixo, extraia e estruture um estilo de comportamento de cliente para uso em simulações de treinamento de vendas.

TEXTO:
${text}

Gere um estilo de comportamento completo e coerente. O nome deve ser curto e memorável. A simulation_guidance deve ser suficientemente detalhada para que a IA simule o cliente de forma consistente.`,
    maxOutputTokens: 1000,
    temperature: 0.3,
  })

  return NextResponse.json({ style: object })
}

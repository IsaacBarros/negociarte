import { generateText } from 'ai'
import { z } from 'zod'
import { openrouter } from './openrouter'
import { modelFor } from './models'
import { buildEvaluatorPrompt } from './prompts/evaluator-template'
import type { Database } from '@/types/database'

type TrainingSession = Database['public']['Tables']['training_sessions']['Row']
type Message = { role: 'user' | 'assistant'; content: string }

const EvaluationSchema = z.object({
  overall_score: z.number().int().min(1).max(10),
  strengths: z.string(),
  improvements: z.string(),
  techniques_used: z.array(z.string()),
  techniques_missed: z.array(z.string()),
})

export type EvaluationResult = z.infer<typeof EvaluationSchema>

interface EvaluateSessionOptions {
  session: TrainingSession & {
    customer_profiles: {
      name: string
      difficulty_level: string | null
      scenario_type: string | null
    } | null
  }
  messages: Message[]
}

export async function evaluateSession({
  session,
  messages,
}: EvaluateSessionOptions): Promise<EvaluationResult> {
  const profile = session.customer_profiles

  const prompt = buildEvaluatorPrompt({
    profileName: profile?.name ?? 'Perfil desconhecido',
    difficultyLevel: profile?.difficulty_level ?? null,
    scenarioType: profile?.scenario_type ?? null,
    messages,
  })

  const model = modelFor('evaluation')

  const { text } = await generateText({
    model: openrouter(model),
    prompt,
    maxOutputTokens: 800,
    temperature: 0.2,
  })

  // Extrai o JSON da resposta (pode vir com markdown code block)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch?.[0]) {
    throw new Error('Resposta da IA não contém JSON válido.')
  }

  const parsed: unknown = JSON.parse(jsonMatch[0])
  return EvaluationSchema.parse(parsed)
}

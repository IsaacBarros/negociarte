import { generateObject } from 'ai'
import { z } from 'zod'
import { openrouter } from './openrouter'
import { modelFor } from './models'
import { buildEvaluatorPrompt } from './prompts/evaluator-template'
import type { Database } from '@/types/database'

type TrainingSession = Database['public']['Tables']['training_sessions']['Row']
type Message = { role: 'user' | 'assistant'; content: string }

const BehaviorScore = z.object({
  score: z.number().int().min(0).max(5),
  evidence: z.string(),
})

const StageScoresSchema = z.object({
  planejamento: z.object({
    preparacao_apresentacao: BehaviorScore,
    estrategia_abordagem: BehaviorScore,
  }),
  abertura: z.object({
    proposito_visita: BehaviorScore,
    adaptacao_estilo: BehaviorScore,
  }),
  entendimento_necessidades: z.object({
    perguntas_diagnostico: BehaviorScore,
    escuta_ativa: BehaviorScore,
  }),
  argumentacao: z.object({
    solucoes_necessidades: BehaviorScore,
    mensagem_clara: BehaviorScore,
    beneficios_proposta: BehaviorScore,
  }),
  objecoes: z.object({
    contorno_objecoes: BehaviorScore,
  }),
  encerramento: z.object({
    conclusao_visita: BehaviorScore,
  }),
})

export type StageScores = z.infer<typeof StageScoresSchema>

export const EvaluationSchema = z.object({
  strengths: z.string(),
  improvements: z.string(),
  techniques_used: z.array(z.string()),
  techniques_missed: z.array(z.string()),
  stage_scores: StageScoresSchema,
  outcome: z.enum(['accepted', 'advanced', 'refused', 'inconclusive']),
})

export type EvaluationResult = z.infer<typeof EvaluationSchema> & { overall_score: number }

const BEHAVIOR_WEIGHTS = {
  planejamento: { preparacao_apresentacao: 20, estrategia_abordagem: 10 },
  abertura: { proposito_visita: 10, adaptacao_estilo: 20 },
  entendimento_necessidades: { perguntas_diagnostico: 20, escuta_ativa: 20 },
  argumentacao: { solucoes_necessidades: 20, mensagem_clara: 20, beneficios_proposta: 20 },
  objecoes: { contorno_objecoes: 20 },
  encerramento: { conclusao_visita: 20 },
} as const

function computeTotalScore(s: StageScores): number {
  const w = BEHAVIOR_WEIGHTS
  const pts = (score: number, valor: number) => score * (valor / 5)
  return Math.round(
    pts(s.planejamento.preparacao_apresentacao.score, w.planejamento.preparacao_apresentacao) +
    pts(s.planejamento.estrategia_abordagem.score, w.planejamento.estrategia_abordagem) +
    pts(s.abertura.proposito_visita.score, w.abertura.proposito_visita) +
    pts(s.abertura.adaptacao_estilo.score, w.abertura.adaptacao_estilo) +
    pts(s.entendimento_necessidades.perguntas_diagnostico.score, w.entendimento_necessidades.perguntas_diagnostico) +
    pts(s.entendimento_necessidades.escuta_ativa.score, w.entendimento_necessidades.escuta_ativa) +
    pts(s.argumentacao.solucoes_necessidades.score, w.argumentacao.solucoes_necessidades) +
    pts(s.argumentacao.mensagem_clara.score, w.argumentacao.mensagem_clara) +
    pts(s.argumentacao.beneficios_proposta.score, w.argumentacao.beneficios_proposta) +
    pts(s.objecoes.contorno_objecoes.score, w.objecoes.contorno_objecoes) +
    pts(s.encerramento.conclusao_visita.score, w.encerramento.conclusao_visita),
  )
}

interface EvaluateSessionOptions {
  session: TrainingSession & {
    customer_profiles: {
      name: string
      difficulty_level: string | null
      scenario_type: string | null
      visit_objective?: string | null
      success_criteria?: string | null
      sales_process_context?: string | null
      sales_competencies_context?: string | null
    } | null
    behavior_styles?: {
      name: string
      description: string
      evaluation_criteria: string | null
    } | null
  }
  messages: Message[]
  durationMinutes?: number | null
}

export async function evaluateSession({
  session,
  messages,
  durationMinutes,
}: EvaluateSessionOptions): Promise<EvaluationResult> {
  const profile = session.customer_profiles
  const behaviorStyle = session.behavior_styles

  const prompt = buildEvaluatorPrompt({
    profileName: profile?.name ?? 'Perfil desconhecido',
    difficultyLevel: profile?.difficulty_level ?? null,
    scenarioType: profile?.scenario_type ?? null,
    visitObjective: profile?.visit_objective ?? null,
    successCriteria: profile?.success_criteria ?? null,
    salesProcessContext: profile?.sales_process_context ?? null,
    salesCompetenciesContext: profile?.sales_competencies_context ?? null,
    behaviorStyleName: behaviorStyle?.name ?? null,
    behaviorStyleDescription: behaviorStyle?.description ?? null,
    behaviorEvaluationCriteria: behaviorStyle?.evaluation_criteria ?? null,
    messageCount: messages.length,
    durationMinutes: durationMinutes ?? null,
    messages,
  })

  const { object } = await generateObject({
    model: openrouter(modelFor('evaluation')),
    schema: EvaluationSchema,
    prompt,
    maxOutputTokens: 2000,
    temperature: 0.2,
  })

  return { ...object, overall_score: computeTotalScore(object.stage_scores) }
}

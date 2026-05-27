import { generateObject } from 'ai'
import { z } from 'zod'
import { openrouter } from './openrouter'
import { modelFor } from './models'
import { buildEvaluatorPrompt } from './prompts/evaluator-template'
import type { Database } from '@/types/database'

type TrainingSession = Database['public']['Tables']['training_sessions']['Row']
type Message = { role: 'user' | 'assistant'; content: string }

// ── Custom (dynamic) criteria types ──────────────────────────────────────────

export interface CustomCriteriaStage {
  key: string
  label: string
  behaviors: Array<{ key: string; label: string; weight: number }>
}

export interface CustomCriteria {
  stages: CustomCriteriaStage[]
  total_points: number
}

// ── Hardcoded fallback schema ─────────────────────────────────────────────────

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

const EvaluationBaseSchema = z.object({
  strengths: z.string(),
  improvements: z.string(),
  techniques_used: z.array(z.string()),
  techniques_missed: z.array(z.string()),
  outcome: z.enum(['accepted', 'advanced', 'refused', 'inconclusive']),
})

const EvaluationSchema = EvaluationBaseSchema.extend({ stage_scores: StageScoresSchema })

// ── Default stages config — mirrors the hardcoded schema above ────────────────

export const DEFAULT_STAGES_CONFIG: CustomCriteriaStage[] = [
  {
    key: 'planejamento',
    label: 'Planejamento',
    behaviors: [
      { key: 'preparacao_apresentacao', label: 'Preparado para a apresentação', weight: 20 },
      { key: 'estrategia_abordagem', label: 'Estratégia de abordagem', weight: 10 },
    ],
  },
  {
    key: 'abertura',
    label: 'Abertura',
    behaviors: [
      { key: 'proposito_visita', label: 'Propósito da visita comunicado', weight: 10 },
      { key: 'adaptacao_estilo', label: 'Adaptação ao estilo do cliente', weight: 20 },
    ],
  },
  {
    key: 'entendimento_necessidades',
    label: 'Entendimento das necessidades',
    behaviors: [
      { key: 'perguntas_diagnostico', label: 'Perguntas de diagnóstico', weight: 20 },
      { key: 'escuta_ativa', label: 'Escuta ativa', weight: 20 },
    ],
  },
  {
    key: 'argumentacao',
    label: 'Argumentação',
    behaviors: [
      { key: 'solucoes_necessidades', label: 'Soluções às necessidades', weight: 20 },
      { key: 'mensagem_clara', label: 'Mensagem clara e objetiva', weight: 20 },
      { key: 'beneficios_proposta', label: 'Benefícios da proposta', weight: 20 },
    ],
  },
  {
    key: 'objecoes',
    label: 'Objeções',
    behaviors: [{ key: 'contorno_objecoes', label: 'Contorno de objeções', weight: 20 }],
  },
  {
    key: 'encerramento',
    label: 'Encerramento',
    behaviors: [{ key: 'conclusao_visita', label: 'Conclusão da visita', weight: 20 }],
  },
]

// ── Public result type ────────────────────────────────────────────────────────

export interface EvaluationResult {
  strengths: string
  improvements: string
  techniques_used: string[]
  techniques_missed: string[]
  /** Generic map — keys depend on the criteria used (hardcoded or custom) */
  stage_scores: Record<string, Record<string, { score: number; evidence: string }>>
  outcome: 'accepted' | 'advanced' | 'refused' | 'inconclusive'
  overall_score: number
  /**
   * Stages config used for this evaluation.
   * Stored in raw_evaluation so FeedbackCard can render labels/weights without
   * knowing which criteria were active at evaluation time.
   */
  stages_config: CustomCriteriaStage[]
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

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

function buildDynamicEvaluationSchema(stages: CustomCriteriaStage[]) {
  const stageObj: Record<string, z.ZodTypeAny> = {}
  for (const stage of stages) {
    const behaviorObj: Record<string, z.ZodTypeAny> = {}
    for (const behavior of stage.behaviors) {
      behaviorObj[behavior.key] = BehaviorScore
    }
    stageObj[stage.key] = z.object(behaviorObj)
  }
  return EvaluationBaseSchema.extend({ stage_scores: z.object(stageObj) })
}

function computeDynamicScore(
  stageScores: Record<string, Record<string, { score: number }>>,
  stages: CustomCriteriaStage[],
): number {
  let total = 0
  for (const stage of stages) {
    const stageData = stageScores[stage.key]
    if (!stageData) continue
    for (const behavior of stage.behaviors) {
      const entry = stageData[behavior.key]
      if (entry) total += entry.score * (behavior.weight / 5)
    }
  }
  return Math.round(total)
}

// ── Public API ────────────────────────────────────────────────────────────────

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
  /** If provided, overrides the hardcoded evaluation schema */
  customCriteria?: CustomCriteria | null
}

export async function evaluateSession({
  session,
  messages,
  durationMinutes,
  customCriteria,
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
    customCriteria: customCriteria ?? null,
  })

  const modelId = modelFor('evaluation')

  // ── Dynamic path — custom criteria from DB ────────────────────────────────
  if (customCriteria) {
    const schema = buildDynamicEvaluationSchema(customCriteria.stages)
    const { object } = await generateObject({
      model: openrouter(modelId),
      schema,
      prompt,
      maxOutputTokens: 2000,
      temperature: 0.2,
    })
    // generateObject infers return type from dynamic schema; cast to concrete shape
    const obj = object as unknown as {
      strengths: string
      improvements: string
      techniques_used: string[]
      techniques_missed: string[]
      stage_scores: Record<string, Record<string, { score: number; evidence: string }>>
      outcome: 'accepted' | 'advanced' | 'refused' | 'inconclusive'
    }
    return {
      ...obj,
      overall_score: computeDynamicScore(obj.stage_scores, customCriteria.stages),
      stages_config: customCriteria.stages,
    }
  }

  // ── Hardcoded fallback path ───────────────────────────────────────────────
  const { object } = await generateObject({
    model: openrouter(modelId),
    schema: EvaluationSchema,
    prompt,
    maxOutputTokens: 2000,
    temperature: 0.2,
  })
  return {
    ...object,
    stage_scores: object.stage_scores as unknown as Record<
      string,
      Record<string, { score: number; evidence: string }>
    >,
    overall_score: computeTotalScore(object.stage_scores),
    stages_config: DEFAULT_STAGES_CONFIG,
  }
}

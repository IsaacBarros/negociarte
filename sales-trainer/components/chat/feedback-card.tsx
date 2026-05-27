import type { Database, Json } from '@/types/database'

type SessionFeedback = Database['public']['Tables']['session_feedback']['Row']

// ── Generic types for rendering ───────────────────────────────────────────────

interface BehaviorScore {
  score: number
  evidence: string
}

type GenericStageScores = Record<string, Record<string, BehaviorScore>>

interface StageDef {
  key: string
  label: string
  behaviors: Array<{ key: string; label: string; weight: number }>
}

// ── Hardcoded fallback config — used for feedbacks before custom criteria ──────

const FALLBACK_STAGES: StageDef[] = [
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

// ── Parsers ───────────────────────────────────────────────────────────────────

/**
 * Extracts `stages_config` from `raw_evaluation` JSONB.
 * Returns null if absent (old feedbacks) — callers fall back to FALLBACK_STAGES.
 */
function getStagesConfig(rawEval: Json | null): StageDef[] | null {
  if (!rawEval || typeof rawEval !== 'object' || Array.isArray(rawEval)) return null
  const obj = rawEval as Record<string, unknown>
  if (!Array.isArray(obj.stages_config) || obj.stages_config.length === 0) return null
  try {
    return (obj.stages_config as unknown[]).map((stage) => {
      const s = stage as Record<string, unknown>
      return {
        key: String(s.key ?? ''),
        label: String(s.label ?? ''),
        behaviors: (Array.isArray(s.behaviors) ? s.behaviors : []).map((b) => {
          const beh = b as Record<string, unknown>
          return {
            key: String(beh.key ?? ''),
            label: String(beh.label ?? ''),
            weight: Number(beh.weight ?? 0),
          }
        }),
      }
    })
  } catch {
    return null
  }
}

/**
 * Parses `competency_scores` JSONB into a generic map.
 * Handles both old (hardcoded keys) and new (custom-criteria keys) formats.
 */
function parseGenericStageScores(raw: Json | null): GenericStageScores | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const result: GenericStageScores = {}
  for (const [stageKey, stageVal] of Object.entries(raw as Record<string, unknown>)) {
    if (!stageVal || typeof stageVal !== 'object' || Array.isArray(stageVal)) continue
    result[stageKey] = {}
    for (const [behKey, behVal] of Object.entries(stageVal as Record<string, unknown>)) {
      if (!behVal || typeof behVal !== 'object' || Array.isArray(behVal)) continue
      const bv = behVal as Record<string, unknown>
      if (typeof bv.score === 'number' && typeof bv.evidence === 'string') {
        result[stageKey]![behKey] = { score: bv.score, evidence: bv.evidence }
      }
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  feedback: SessionFeedback
}

export function FeedbackCard({ feedback }: Props) {
  const totalScore = feedback.overall_score ?? 0
  const scoreColor =
    totalScore >= 160 ? 'text-green-600' : totalScore >= 100 ? 'text-yellow-600' : 'text-red-600'
  const scoreLabel =
    totalScore >= 160 ? 'Excelente' : totalScore >= 100 ? 'Bom' : 'Precisa melhorar'

  const stages = parseGenericStageScores(feedback.competency_scores ?? null)
  const stagesConfig =
    getStagesConfig(feedback.raw_evaluation ?? null) ?? FALLBACK_STAGES

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold">Avaliação da sessão</h2>
        <p className="text-xs text-neutral-400">Gerada por IA</p>
      </div>

      {/* Score total */}
      <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3">
        <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{totalScore}</span>
        <div>
          <p className="text-xs text-neutral-400">de 200 pts</p>
          <p className="text-xs font-medium">{scoreLabel}</p>
        </div>
      </div>

      {/* Processo de vendas por etapa — renderização genérica */}
      {stages && (
        <div className="space-y-4">
          {stagesConfig.map((stage) => {
            const stageBehaviors = stages[stage.key]
            if (!stageBehaviors) return null
            return (
              <div key={stage.key}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {stage.label}
                </h3>
                <div className="space-y-3">
                  {stage.behaviors.map((b) => {
                    const entry = stageBehaviors[b.key]
                    if (!entry) return null
                    const pts = Math.round(entry.score * (b.weight / 5))
                    const pct = Math.round((entry.score / 5) * 100)
                    const barColor =
                      entry.score >= 4
                        ? 'bg-green-500'
                        : entry.score >= 3
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                    return (
                      <div key={b.key}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs text-neutral-700 leading-tight">{b.label}</span>
                          <span className="shrink-0 text-xs text-neutral-400 tabular-nums">
                            {pts}/{b.weight}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {entry.evidence && (
                          <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                            {entry.evidence}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pontos fortes */}
      {feedback.strengths && (
        <div>
          <h3 className="mb-1 text-xs font-semibold text-green-700">Pontos fortes</h3>
          <p className="text-xs text-neutral-600 leading-relaxed">{feedback.strengths}</p>
        </div>
      )}

      {/* Melhorias */}
      {feedback.improvements && (
        <div>
          <h3 className="mb-1 text-xs font-semibold text-amber-700">Áreas para melhorar</h3>
          <p className="text-xs text-neutral-600 leading-relaxed">{feedback.improvements}</p>
        </div>
      )}

      {/* Técnicas usadas */}
      {feedback.techniques_used && feedback.techniques_used.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-neutral-600">Técnicas aplicadas</h3>
          <div className="flex flex-wrap gap-1">
            {feedback.techniques_used.map((t, i) => (
              <span key={i} className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Técnicas não usadas */}
      {feedback.techniques_missed && feedback.techniques_missed.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-neutral-600">Técnicas não utilizadas</h3>
          <div className="flex flex-wrap gap-1">
            {feedback.techniques_missed.map((t, i) => (
              <span
                key={i}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import type { Database, Json } from '@/types/database'

type SessionFeedback = Database['public']['Tables']['session_feedback']['Row']

interface BehaviorScore {
  score: number
  evidence: string
}

interface StageScores {
  planejamento: { preparacao_apresentacao: BehaviorScore; estrategia_abordagem: BehaviorScore }
  abertura: { proposito_visita: BehaviorScore; adaptacao_estilo: BehaviorScore }
  entendimento_necessidades: { perguntas_diagnostico: BehaviorScore; escuta_ativa: BehaviorScore }
  argumentacao: {
    solucoes_necessidades: BehaviorScore
    mensagem_clara: BehaviorScore
    beneficios_proposta: BehaviorScore
  }
  objecoes: { contorno_objecoes: BehaviorScore }
  encerramento: { conclusao_visita: BehaviorScore }
}

const STAGE_CONFIG = [
  {
    key: 'planejamento' as const,
    label: 'Planejamento',
    behaviors: [
      { key: 'preparacao_apresentacao' as const, label: 'Preparado para a apresentação', valor: 20 },
      { key: 'estrategia_abordagem' as const, label: 'Estratégia de abordagem', valor: 10 },
    ],
  },
  {
    key: 'abertura' as const,
    label: 'Abertura',
    behaviors: [
      { key: 'proposito_visita' as const, label: 'Propósito da visita comunicado', valor: 10 },
      { key: 'adaptacao_estilo' as const, label: 'Adaptação ao estilo do cliente', valor: 20 },
    ],
  },
  {
    key: 'entendimento_necessidades' as const,
    label: 'Entendimento das necessidades',
    behaviors: [
      { key: 'perguntas_diagnostico' as const, label: 'Perguntas de diagnóstico', valor: 20 },
      { key: 'escuta_ativa' as const, label: 'Escuta ativa', valor: 20 },
    ],
  },
  {
    key: 'argumentacao' as const,
    label: 'Argumentação',
    behaviors: [
      { key: 'solucoes_necessidades' as const, label: 'Soluções às necessidades', valor: 20 },
      { key: 'mensagem_clara' as const, label: 'Mensagem clara e objetiva', valor: 20 },
      { key: 'beneficios_proposta' as const, label: 'Benefícios da proposta', valor: 20 },
    ],
  },
  {
    key: 'objecoes' as const,
    label: 'Objeções',
    behaviors: [
      { key: 'contorno_objecoes' as const, label: 'Contorno de objeções', valor: 20 },
    ],
  },
  {
    key: 'encerramento' as const,
    label: 'Encerramento',
    behaviors: [
      { key: 'conclusao_visita' as const, label: 'Conclusão da visita', valor: 20 },
    ],
  },
]

function parseStageScores(raw: Json | null): StageScores | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  if (!obj.planejamento || !obj.abertura || !obj.entendimento_necessidades) return null
  return raw as unknown as StageScores
}

function getBehaviorEntry(scores: StageScores, stageKey: keyof StageScores, behaviorKey: string): BehaviorScore | null {
  const stage = scores[stageKey] as Record<string, BehaviorScore>
  return stage[behaviorKey] ?? null
}

interface Props {
  feedback: SessionFeedback
}

export function FeedbackCard({ feedback }: Props) {
  const totalScore = feedback.overall_score ?? 0
  const scoreColor =
    totalScore >= 160 ? 'text-green-600' : totalScore >= 100 ? 'text-yellow-600' : 'text-red-600'
  const scoreLabel =
    totalScore >= 160 ? 'Excelente' : totalScore >= 100 ? 'Bom' : 'Precisa melhorar'

  const stages = parseStageScores(feedback.competency_scores ?? null)

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

      {/* Processo de vendas por etapa */}
      {stages && (
        <div className="space-y-4">
          {STAGE_CONFIG.map((stage) => (
            <div key={stage.key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {stage.label}
              </h3>
              <div className="space-y-3">
                {stage.behaviors.map((b) => {
                  const entry = getBehaviorEntry(stages, stage.key, b.key)
                  if (!entry) return null
                  const pts = Math.round(entry.score * (b.valor / 5))
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
                          {pts}/{b.valor}
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
          ))}
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

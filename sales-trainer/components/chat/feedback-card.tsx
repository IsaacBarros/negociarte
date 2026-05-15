import type { Database } from '@/types/database'

type SessionFeedback = Database['public']['Tables']['session_feedback']['Row']

interface Props {
  feedback: SessionFeedback
}

export function FeedbackCard({ feedback }: Props) {
  const score = feedback.overall_score ?? 0
  const scoreColor =
    score >= 8 ? 'text-green-600' : score >= 5 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold">Avaliação da sessão</h2>
        <p className="text-xs text-neutral-400">Gerada por IA</p>
      </div>

      {/* Score */}
      <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3">
        <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
        <div>
          <p className="text-xs text-neutral-400">Nota geral</p>
          <p className="text-xs font-medium">
            {score >= 8 ? 'Excelente' : score >= 5 ? 'Bom' : 'Precisa melhorar'}
          </p>
        </div>
      </div>

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
              <span key={i} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

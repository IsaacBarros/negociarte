import Link from 'next/link'
import { requireAuth } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { Json } from '@/types/database'

export const metadata: Metadata = { title: 'Meu progresso — Negociarte' }

const outcomeLabel: Record<string, string> = {
  accepted: 'Aceito',
  rejected: 'Recusado',
  ended_by_errors: 'Inconclusivo',
}
const outcomeColor: Record<string, string> = {
  accepted: 'text-green-600',
  rejected: 'text-red-500',
  ended_by_errors: 'text-neutral-400',
}

const BEHAVIOR_LABELS: Record<string, string> = {
  preparacao_apresentacao: 'Preparação',
  estrategia_abordagem: 'Estratégia',
  proposito_visita: 'Propósito',
  adaptacao_estilo: 'Adaptação ao estilo',
  perguntas_diagnostico: 'Perguntas',
  escuta_ativa: 'Escuta ativa',
  solucoes_necessidades: 'Soluções',
  mensagem_clara: 'Mensagem clara',
  beneficios_proposta: 'Benefícios',
  contorno_objecoes: 'Objeções',
  conclusao_visita: 'Encerramento',
}

interface BehaviorScore {
  score: number
  evidence: string
}

type StageScores = Record<string, Record<string, BehaviorScore>>

function extractBehaviorScores(raw: Json | null): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const stages = raw as unknown as StageScores
  const result: Record<string, number> = {}
  for (const stage of Object.values(stages)) {
    if (typeof stage !== 'object' || Array.isArray(stage)) continue
    for (const [key, val] of Object.entries(stage)) {
      if (val && typeof val === 'object' && !Array.isArray(val) && 'score' in val) {
        result[key] = (val as BehaviorScore).score
      }
    }
  }
  return result
}

export default async function TrainHistoryPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: sessionsRaw } = await supabase
    .from('training_sessions')
    .select(
      'id, title, started_at, ended_at, outcome, customer_profile_id, session_feedback(overall_score, competency_scores)',
    )
    .eq('seller_id', user.id)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(20)

  const profileIds = [
    ...new Set((sessionsRaw ?? []).map((s) => s.customer_profile_id)),
  ]
  const { data: profilesRaw } = profileIds.length
    ? await supabase.from('customer_profiles').select('id, name').in('id', profileIds)
    : { data: [] }

  const profileMap = new Map(
    (profilesRaw as { id: string; name: string }[] ?? []).map((p) => [p.id, p.name]),
  )

  type SessionRow = {
    id: string
    title: string | null
    started_at: string
    ended_at: string | null
    outcome: string | null
    customer_profile_id: string
    session_feedback: { overall_score: number | null; competency_scores: Json | null }[] | null
  }

  const sessions = (sessionsRaw ?? []) as unknown as SessionRow[]

  // Calcular médias dos últimos 5 comportamentos
  const last5 = sessions.slice(0, 5)
  const behaviorSums: Record<string, number[]> = {}
  for (const s of last5) {
    const fb = Array.isArray(s.session_feedback) ? s.session_feedback[0] : null
    if (!fb) continue
    const scores = extractBehaviorScores(fb.competency_scores)
    for (const [key, val] of Object.entries(scores)) {
      if (!behaviorSums[key]) behaviorSums[key] = []
      behaviorSums[key].push(val)
    }
  }
  const behaviorAverages: Record<string, number> = {}
  for (const [key, vals] of Object.entries(behaviorSums)) {
    behaviorAverages[key] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link href="/train" className="text-sm text-neutral-400 hover:text-neutral-700">
          ← Treinar
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Meu progresso</h1>
        <p className="text-sm text-neutral-500">
          Últimas {sessions.length} sessões concluídas.
        </p>
      </div>

      {sessions.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-sm text-neutral-500">Nenhuma sessão concluída ainda.</p>
          <Link
            href="/train"
            className="mt-3 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Iniciar simulação
          </Link>
        </div>
      )}

      {sessions.length > 0 && (
        <>
          {/* Médias recentes por comportamento */}
          {Object.keys(behaviorAverages).length > 0 && (
            <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold">
                Média por comportamento{last5.length < sessions.length ? ` (últimas ${last5.length} sessões)` : ''}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(behaviorAverages).map(([key, avg]) => {
                  const pct = Math.round((avg / 5) * 100)
                  const barColor =
                    avg >= 4 ? 'bg-green-500' : avg >= 3 ? 'bg-yellow-400' : 'bg-red-400'
                  return (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-neutral-700">{BEHAVIOR_LABELS[key] ?? key}</span>
                        <span className="tabular-nums text-neutral-400">{avg}/5</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Histórico de sessões */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-neutral-500">Histórico de sessões</h2>
            {sessions.map((s) => {
              const fb = Array.isArray(s.session_feedback) ? s.session_feedback[0] : null
              const score = fb?.overall_score ?? null
              const scoreColor =
                score === null
                  ? 'text-neutral-400'
                  : score >= 160
                    ? 'text-green-600'
                    : score >= 100
                      ? 'text-yellow-600'
                      : 'text-red-500'
              return (
                <Link
                  key={s.id}
                  href={`/train/${s.id}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {s.title ?? profileMap.get(s.customer_profile_id) ?? '—'}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {new Date(s.started_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {s.ended_at && (
                        <span>
                          {' · '}
                          {Math.round(
                            (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) /
                              60000,
                          )}{' '}
                          min
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-4">
                    {s.outcome && (
                      <span className={`text-xs ${outcomeColor[s.outcome] ?? 'text-neutral-400'}`}>
                        {outcomeLabel[s.outcome] ?? s.outcome}
                      </span>
                    )}
                    <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>
                      {score !== null ? score : '—'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

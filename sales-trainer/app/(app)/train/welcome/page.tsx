import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, Trophy, Target, TrendingUp } from 'lucide-react'

export default async function WelcomePage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Busca progresso recente do seller
  const { data: recentSessions } = await supabase
    .from('training_sessions')
    .select('id, status, outcome')
    .eq('seller_id', user.id)
    .order('started_at', { ascending: false })
    .limit(10)

  const sessions = recentSessions ?? []
  const completedSessions = sessions.filter((s) => s.status === 'completed')

  // Busca scores das sessões completadas
  const completedIds = completedSessions.map((s) => s.id)
  const { data: feedbacks } = completedIds.length > 0
    ? await supabase
        .from('session_feedback')
        .select('session_id, overall_score')
        .in('session_id', completedIds)
    : { data: [] }

  const scores = (feedbacks ?? [])
    .map((f) => f.overall_score)
    .filter((s): s is number => s !== null)
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null
  const accepted = completedSessions.filter((s) => s.outcome === 'accepted').length

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Header de boas-vindas */}
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-neutral-100">
          <span className="text-3xl">👋</span>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Olá, {user.full_name?.split(' ')[0] ?? 'vendedor'}!
        </h1>
        <p className="mt-2 text-neutral-500">
          Pronto para treinar? Cada simulação aproxima você da excelência em vendas.
        </p>
      </div>

      {/* Cards de progresso */}
      {completedSessions.length > 0 && (
        <div className="mb-8 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-neutral-400">
              <Target className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Sessões</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{completedSessions.length}</p>
            <p className="text-xs text-neutral-400">concluídas</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-neutral-400">
              <TrendingUp className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Média</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {avgScore !== null ? `${avgScore}` : '—'}
            </p>
            <p className="text-xs text-neutral-400">de 200 pts</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-neutral-400">
              <Trophy className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Aceites</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{accepted}</p>
            <p className="text-xs text-neutral-400">simulações</p>
          </div>
        </div>
      )}

      {/* CTA principal */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">Iniciar treino</h2>
        <p className="mb-6 text-sm text-neutral-500">
          Escolha um cenário de simulação e pratique com um cliente de IA.
        </p>
        <Link
          href="/train"
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
        >
          Escolher cenário
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Link para histórico */}
      {completedSessions.length > 0 && (
        <div className="mt-4 text-center">
          <Link href="/train/history" className="text-sm text-neutral-400 hover:text-neutral-700 underline underline-offset-2">
            Ver meu histórico completo
          </Link>
        </div>
      )}
    </div>
  )
}

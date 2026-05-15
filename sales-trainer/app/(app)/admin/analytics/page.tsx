import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics — Sales Trainer' }

export default async function AdminAnalyticsPage() {
  const user = await requireAdmin()
  const supabase = await createClient()

  const [
    { count: totalSessions },
    { count: completedSessions },
    { data: profilesData },
    { data: sellersData },
    { data: feedbackData },
  ] = await Promise.all([
    supabase
      .from('training_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', user.organization_id),

    supabase
      .from('training_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', user.organization_id)
      .eq('status', 'completed'),

    supabase
      .from('customer_profiles')
      .select('id, name')
      .eq('organization_id', user.organization_id)
      .eq('is_active', true)
      .limit(5),

    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('organization_id', user.organization_id)
      .eq('role', 'seller')
      .limit(10),

    supabase
      .from('session_feedback')
      .select('overall_score, session_id')
      .limit(200),
  ])

  const typedFeedback = (feedbackData ?? []) as { overall_score: number | null; session_id: string }[]
  const scores = typedFeedback.map((d) => d.overall_score).filter((s): s is number => s !== null)
  const avgScore =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null

  const typedProfiles = (profilesData ?? []) as { id: string; name: string }[]
  const typedSellers = (sellersData ?? []) as { id: string; full_name: string | null; email: string }[]

  const stats = [
    { label: 'Total de sessões', value: totalSessions ?? 0 },
    { label: 'Sessões concluídas', value: completedSessions ?? 0 },
    { label: 'Nota média', value: avgScore ? `${avgScore}/10` : '—' },
    {
      label: 'Taxa de conclusão',
      value:
        totalSessions && completedSessions
          ? `${Math.round((completedSessions / totalSessions) * 100)}%`
          : '—',
    },
  ]

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-neutral-200 p-4">
            <p className="text-xs text-neutral-400">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Perfis de treino ativos</h2>
          <div className="space-y-2">
            {typedProfiles.length > 0 ? (
              typedProfiles.map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
                >
                  {p.name}
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-400">Nenhum perfil ativo.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Vendedores</h2>
          <div className="space-y-2">
            {typedSellers.length > 0 ? (
              typedSellers.map((s) => (
                <div
                  key={s.id}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
                >
                  {s.full_name ?? s.email}
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-400">Nenhum vendedor cadastrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

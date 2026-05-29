import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics — Negociarte' }

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>
}) {
  const { company } = await searchParams
  const user = await requireAdmin()
  const supabase = await createClient()

  // Empresas para o filtro
  const { data: companiesData } = await supabase
    .from('scenario_companies')
    .select('id, name')
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .order('name')

  const companies = (companiesData ?? []) as { id: string; name: string }[]

  // Se filtro ativo: busca IDs de perfis da empresa selecionada
  let profileIds: string[] | null = null
  if (company) {
    const { data: companyProfiles } = await supabase
      .from('customer_profiles')
      .select('id')
      .eq('organization_id', user.organization_id)
      .eq('company_id', company)
    profileIds = (companyProfiles ?? []).map((p) => (p as { id: string }).id)
  }

  // Filtro a aplicar nas queries de training_sessions
  const noResults = profileIds !== null && profileIds.length === 0
  const sessionFilter = profileIds?.length ? profileIds : ['__none__']

  function sessionsBase() {
    const q = supabase
      .from('training_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', user.organization_id)
    return profileIds !== null ? q.in('customer_profile_id', sessionFilter) : q
  }

  const [
    { count: totalSessions },
    { count: completedSessions },
    { count: acceptedSessions },
    { data: profilesData },
    { data: sellersData },
    { data: feedbackData },
  ] = await Promise.all([
    noResults
      ? Promise.resolve({ count: 0 })
      : sessionsBase(),

    noResults
      ? Promise.resolve({ count: 0 })
      : sessionsBase().eq('status', 'completed'),

    noResults
      ? Promise.resolve({ count: 0 })
      : sessionsBase().eq('status', 'completed').eq('outcome', 'accepted'),

    // Perfis ativos (filtrados por empresa se selecionada)
    (() => {
      const q = supabase
        .from('customer_profiles')
        .select('id, name')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
        .limit(5)
      return company ? q.eq('company_id', company) : q
    })(),

    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('organization_id', user.organization_id)
      .eq('role', 'seller')
      .limit(10),

    // Feedback: filtra via join se há filtro de empresa
    noResults
      ? Promise.resolve({ data: [] })
      : (() => {
          const q = supabase
            .from('session_feedback')
            .select('overall_score, training_sessions!inner(organization_id, customer_profile_id)')
            .eq('training_sessions.organization_id', user.organization_id)
            .limit(500)
          return profileIds !== null
            ? q.in('training_sessions.customer_profile_id', sessionFilter)
            : q
        })(),
  ])

  const typedFeedback = (feedbackData ?? []) as { overall_score: number | null }[]
  const scores = typedFeedback.map((d) => d.overall_score).filter((s): s is number => s !== null)
  const avgScore =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null

  const typedProfiles = (profilesData ?? []) as { id: string; name: string }[]
  const typedSellers = (sellersData ?? []) as { id: string; full_name: string | null; email: string }[]

  const conversionRate =
    completedSessions && (acceptedSessions ?? 0) > 0
      ? `${Math.round(((acceptedSessions ?? 0) / completedSessions) * 100)}%`
      : '—'

  const stats = [
    { label: 'Total de sessões', value: totalSessions ?? 0 },
    { label: 'Sessões concluídas', value: completedSessions ?? 0 },
    { label: 'Nota média', value: avgScore ? `${avgScore}/200` : '—' },
    {
      label: 'Taxa de conclusão',
      value:
        totalSessions && completedSessions
          ? `${Math.round((completedSessions / totalSessions) * 100)}%`
          : '—',
    },
    { label: 'Sessões com aceite', value: acceptedSessions ?? 0 },
    { label: 'Taxa de conversão (aceite)', value: conversionRate },
  ]

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">Analytics</h1>

      {/* Filtro por projeto */}
      <form className="mb-6 flex gap-2">
        <select
          name="company"
          defaultValue={company ?? ''}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
        >
          <option value="">Todos os projetos</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
        >
          Filtrar
        </button>

        {company && (
          <a
            href="/admin/analytics"
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            Limpar
          </a>
        )}
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-neutral-200 p-4">
            <p className="text-xs text-neutral-400">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold">
            {company ? 'Cenários ativos do projeto' : 'Perfis de treino ativos'}
          </h2>
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

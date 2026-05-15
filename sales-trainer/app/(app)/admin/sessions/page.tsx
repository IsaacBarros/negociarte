import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sessões — Negociarte' }

const statusLabel: Record<string, string> = {
  active: 'Em andamento',
  completed: 'Concluída',
  abandoned: 'Abandonada',
}

const statusColor: Record<string, string> = {
  active: 'text-green-600',
  completed: 'text-neutral-600',
  abandoned: 'text-neutral-400',
}

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ seller?: string; status?: string }>
}) {
  const { seller, status } = await searchParams
  const user = await requireAdmin()
  const supabase = await createClient()

  // Busca sessões (sem joins complexos para evitar problemas de tipo)
  let sessionsQuery = supabase
    .from('training_sessions')
    .select('id, title, status, started_at, ended_at, total_tokens, seller_id, customer_profile_id')
    .eq('organization_id', user.organization_id)
    .order('started_at', { ascending: false })
    .limit(50)

  if (seller) sessionsQuery = sessionsQuery.eq('seller_id', seller)
  if (status) sessionsQuery = sessionsQuery.eq('status', status)

  const { data: sessionsRaw } = await sessionsQuery

  const sessions = (sessionsRaw ?? []) as {
    id: string
    title: string | null
    status: string
    started_at: string
    ended_at: string | null
    total_tokens: number
    seller_id: string
    customer_profile_id: string
  }[]

  // Busca perfis de vendedores e clientes em batch
  const sellerIds = [...new Set(sessions.map((s) => s.seller_id))]
  const profileIds = [...new Set(sessions.map((s) => s.customer_profile_id))]

  const [{ data: sellersData }, { data: profilesData }, { data: feedbackData }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('organization_id', user.organization_id)
        .eq('role', 'seller'),
      supabase.from('customer_profiles').select('id, name').in('id', profileIds.length ? profileIds : ['none']),
      supabase
        .from('session_feedback')
        .select('session_id, overall_score')
        .in('session_id', sessions.length ? sessions.map((s) => s.id) : ['none']),
    ])

  const sellersMap = new Map(
    (sellersData as { id: string; full_name: string | null; email: string }[] ?? []).map((s) => [s.id, s]),
  )
  const profilesMap = new Map(
    (profilesData as { id: string; name: string }[] ?? []).map((p) => [p.id, p]),
  )
  const feedbackMap = new Map(
    (feedbackData as { session_id: string; overall_score: number | null }[] ?? []).map((f) => [
      f.session_id,
      f.overall_score,
    ]),
  )

  const allSellers = sellersData as { id: string; full_name: string | null; email: string }[] ?? []

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">Sessões de treino</h1>

      {/* Filtros */}
      <form className="mb-4 flex gap-2">
        <select
          name="seller"
          defaultValue={seller ?? ''}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
        >
          <option value="">Todos os vendedores</option>
          {allSellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name ?? s.email}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={status ?? ''}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="active">Em andamento</option>
          <option value="completed">Concluídas</option>
          <option value="abandoned">Abandonadas</option>
        </select>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
        >
          Filtrar
        </button>
      </form>

      {!sessions.length && (
        <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-sm text-neutral-500">Nenhuma sessão encontrada.</p>
        </div>
      )}

      <div className="space-y-2">
        {sessions.map((s) => {
          const seller2 = sellersMap.get(s.seller_id)
          const profile = profilesMap.get(s.customer_profile_id)
          const score = feedbackMap.get(s.id)

          return (
            <Link
              key={s.id}
              href={`/admin/sessions/${s.id}`}
              className="flex items-center gap-4 rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{s.title ?? profile?.name ?? '—'}</p>
                  <span className={`text-xs ${statusColor[s.status] ?? ''}`}>
                    {statusLabel[s.status] ?? s.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  {seller2?.full_name ?? seller2?.email ?? '—'} ·{' '}
                  {new Date(s.started_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-right">
                {score !== undefined && score !== null && (
                  <div>
                    <p className="text-xs text-neutral-400">Nota</p>
                    <p className="text-sm font-semibold">{score}/10</p>
                  </div>
                )}
                {s.total_tokens > 0 && (
                  <div>
                    <p className="text-xs text-neutral-400">Tokens</p>
                    <p className="text-sm">{s.total_tokens.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

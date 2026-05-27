import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { SessionsTable } from '@/components/admin/SessionsTable'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sessões — Negociarte' }

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
  if (status) sessionsQuery = sessionsQuery.eq('status', status as 'active' | 'completed' | 'abandoned')

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

  const allSellers = (sellersData as { id: string; full_name: string | null; email: string }[] ?? [])

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

      <SessionsTable
        sessions={sessions}
        sellers={allSellers}
        profiles={(profilesData ?? []) as { id: string; name: string }[]}
        feedbacks={(feedbackData ?? []) as { session_id: string; overall_score: number | null }[]}
      />
    </div>
  )
}

import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { ProfilesTable } from '@/components/admin/ProfilesTable'
import { CompanyFilter } from '@/components/admin/CompanyFilter'
import type { Metadata } from 'next'
import type { Database } from '@/types/database'

export const metadata: Metadata = { title: 'Cenários — Negociarte' }

type Profile = Database['public']['Tables']['customer_profiles']['Row']

export default async function AdminProfilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const selectedCompanyId = typeof sp.company === 'string' ? sp.company : null

  const user = await requireAdmin()
  const supabase = await createClient()

  // Empresas para o filtro
  const { data: companiesRaw } = await supabase
    .from('scenario_companies')
    .select('id, name')
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  const companies = (companiesRaw ?? []) as { id: string; name: string }[]

  // Perfis — filtrados por empresa se o parâmetro estiver presente
  const baseQuery = supabase
    .from('customer_profiles')
    .select('id, name, description, difficulty_level, is_active, scenario_type, chat_model, buyer_role, industry, created_at')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  const { data: profiles } = selectedCompanyId
    ? await baseQuery.eq('company_id', selectedCompanyId)
    : await baseQuery

  const typedProfiles = (profiles ?? []) as Pick<
    Profile,
    'id' | 'name' | 'description' | 'difficulty_level' | 'is_active' | 'scenario_type' | 'chat_model' | 'buyer_role' | 'industry' | 'created_at'
  >[]

  // Contagem de sessões por perfil para aviso no dialog de exclusão
  const profileIds = typedProfiles.map((p) => p.id)
  const { data: sessionsRaw } = profileIds.length
    ? await supabase
        .from('training_sessions')
        .select('customer_profile_id')
        .eq('organization_id', user.organization_id)
        .in('customer_profile_id', profileIds)
    : { data: [] as { customer_profile_id: string }[] }

  const sessionCounts = (sessionsRaw ?? []).reduce<Record<string, number>>(
    (acc, s) => {
      acc[s.customer_profile_id] = (acc[s.customer_profile_id] ?? 0) + 1
      return acc
    },
    {},
  )

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cenários</h1>
        <div className="flex items-center gap-3">
          <CompanyFilter companies={companies} selectedId={selectedCompanyId} />
          <Link
            href="/admin/profiles/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
          >
            + Novo cenário
          </Link>
        </div>
      </div>

      <ProfilesTable profiles={typedProfiles} sessionCounts={sessionCounts} />
    </div>
  )
}

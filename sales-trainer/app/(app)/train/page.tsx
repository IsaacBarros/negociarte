import Link from 'next/link'
import { requireAuth } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { Database } from '@/types/database'

export const metadata: Metadata = { title: 'Treinar — Negociarte' }

type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row']
type TrainingSession = Database['public']['Tables']['training_sessions']['Row']
type ScenarioCompany = Database['public']['Tables']['scenario_companies']['Row']

const difficultyLabel: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  trainee_choice: 'Você escolhe',
}
const difficultyColor: Record<string, string> = {
  easy: 'bg-green-50 text-green-700',
  medium: 'bg-yellow-50 text-yellow-700',
  hard: 'bg-red-50 text-red-700',
  trainee_choice: 'bg-neutral-100 text-neutral-600',
}
const scenarioLabel: Record<string, string> = {
  discovery: 'Descoberta',
  objection_handling: 'Objeções',
  closing: 'Fechamento',
}

type ProfileCard = Pick<
  CustomerProfile,
  'id' | 'name' | 'description' | 'difficulty_level' | 'scenario_type' | 'buyer_role' | 'company_id'
>

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function ProfileCard({ profile }: { profile: ProfileCard }) {
  return (
    <Link
      href={`/train/cliente/${profile.id}`}
      className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-neutral-400 hover:shadow-sm"
    >
      {/* Avatar com inicial */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
        {getInitials(profile.name)}
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-neutral-900 group-hover:text-neutral-700">
              {profile.name}
            </p>
            {profile.buyer_role && (
              <p className="mt-0.5 text-xs text-neutral-500">{profile.buyer_role}</p>
            )}
          </div>
          {/* Badges */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            {profile.difficulty_level && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  difficultyColor[profile.difficulty_level] ?? ''
                }`}
              >
                {difficultyLabel[profile.difficulty_level] ?? profile.difficulty_level}
              </span>
            )}
            {profile.scenario_type && scenarioLabel[profile.scenario_type] && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                {scenarioLabel[profile.scenario_type]}
              </span>
            )}
          </div>
        </div>

        {profile.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-500">
            {profile.description}
          </p>
        )}

        {/* CTA sutil */}
        <p className="mt-3 text-xs font-medium text-neutral-400 group-hover:text-neutral-600">
          Conhecer cliente →
        </p>
      </div>
    </Link>
  )
}

export default async function TrainPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Sessão ativa
  const { data: activeSessionsRaw } = await supabase
    .from('training_sessions')
    .select('id, title, customer_profile_id, started_at')
    .eq('seller_id', user.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)

  const activeSession = ((activeSessionsRaw ?? [])[0] ?? null) as {
    id: string
    title: string | null
    customer_profile_id: string
    started_at: string
  } | null

  // Empresas às quais o seller está vinculado
  const { data: linkedCompaniesRaw } = await supabase
    .from('seller_companies')
    .select('company_id')
    .eq('seller_id', user.id)

  const linkedCompanyIds = (linkedCompaniesRaw ?? []).map((lc) => lc.company_id)

  // Perfis disponíveis — filtra pelas empresas do seller (se vinculado)
  const profilesQuery = supabase
    .from('customer_profiles')
    .select('id, name, description, difficulty_level, scenario_type, buyer_role, company_id')
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  const { data: profilesRaw } = linkedCompanyIds.length > 0
    ? await profilesQuery.in('company_id', linkedCompanyIds)
    : await profilesQuery

  const profiles = (profilesRaw ?? []) as ProfileCard[]

  // Empresas para agrupamento e cabeçalho
  const { data: companiesRaw } = linkedCompanyIds.length > 0
    ? await supabase
        .from('scenario_companies')
        .select('id, name, description')
        .in('id', linkedCompanyIds)
        .order('name', { ascending: true })
    : { data: [] as Pick<ScenarioCompany, 'id' | 'name' | 'description'>[] }

  const companies = (companiesRaw ?? []) as Pick<ScenarioCompany, 'id' | 'name' | 'description'>[]

  // Sessões recentes
  const { data: sessionsRaw } = await supabase
    .from('training_sessions')
    .select('id, title, status, started_at, customer_profile_id')
    .eq('seller_id', user.id)
    .in('status', ['completed', 'abandoned'])
    .order('started_at', { ascending: false })
    .limit(6)

  const sessions = (sessionsRaw ?? []) as Pick<
    TrainingSession,
    'id' | 'title' | 'status' | 'started_at' | 'customer_profile_id'
  >[]

  // Nomes dos perfis das sessões recentes
  const profileIds = [...new Set(sessions.map((s) => s.customer_profile_id))]
  const { data: sessionProfilesRaw } = profileIds.length
    ? await supabase.from('customer_profiles').select('id, name').in('id', profileIds)
    : { data: [] }
  const sessionProfilesMap = new Map(
    (sessionProfilesRaw as { id: string; name: string }[] ?? []).map((p) => [p.id, p.name]),
  )

  // Agrupa perfis por empresa quando há mais de uma
  const showGroups = companies.length > 1
  const profilesByCompany = new Map(
    companies.map((c) => [
      c.id,
      profiles.filter((p) => p.company_id === c.id),
    ]),
  )
  // Perfis sem empresa vinculada
  const unlinkedProfiles = profiles.filter((p) => !p.company_id)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Seus clientes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Escolha um cliente para ver o perfil completo e iniciar a simulação.
        </p>
      </div>

      {/* Sessão ativa */}
      {activeSession && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-amber-900">Simulação em andamento</p>
            <p className="text-xs text-amber-700">{activeSession.title ?? 'Sessão ativa'}</p>
          </div>
          <Link
            href={`/train/${activeSession.id}`}
            className="ml-4 shrink-0 rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Continuar
          </Link>
        </div>
      )}

      {/* Estado vazio — sem projetos vinculados */}
      {linkedCompanyIds.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
            <svg className="h-6 w-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h2 className="mb-1 text-sm font-semibold text-neutral-700">Nenhum projeto vinculado</h2>
          <p className="text-sm text-neutral-500">
            Solicite ao seu gestor o link de acesso ao projeto de treino.
          </p>
        </div>
      )}

      {/* Estado vazio — vinculado mas sem perfis */}
      {linkedCompanyIds.length > 0 && profiles.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-12 text-center">
          <p className="text-sm text-neutral-500">Nenhum cliente disponível no momento.</p>
          <p className="mt-1 text-sm text-neutral-400">Aguarde seu gestor adicionar cenários de treino.</p>
        </div>
      )}

      {/* Lista de clientes */}
      {profiles.length > 0 && (
        showGroups ? (
          /* Agrupado por empresa */
          <div className="space-y-8">
            {companies.map((company) => {
              const compProfiles = profilesByCompany.get(company.id) ?? []
              if (compProfiles.length === 0) return null
              return (
                <div key={company.id}>
                  <div className="mb-3">
                    <h2 className="text-sm font-semibold text-neutral-700">{company.name}</h2>
                    {company.description && (
                      <p className="mt-0.5 text-xs text-neutral-400 line-clamp-1">
                        {company.description}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    {compProfiles.map((p) => (
                      <ProfileCard key={p.id} profile={p} />
                    ))}
                  </div>
                </div>
              )
            })}
            {unlinkedProfiles.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold text-neutral-500">Outros cenários</h2>
                <div className="space-y-3">
                  {unlinkedProfiles.map((p) => (
                    <ProfileCard key={p.id} profile={p} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Lista simples */
          <div className="space-y-3">
            {profiles.map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
          </div>
        )
      )}

      {/* Sessões recentes */}
      {sessions.length > 0 && (
        <div className="mt-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-500">Simulações recentes</h2>
            <Link href="/train/history" className="text-xs text-neutral-400 hover:text-neutral-600">
              Ver histórico →
            </Link>
          </div>
          <div className="space-y-2">
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/train/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
              >
                <div>
                  <p className="text-sm text-neutral-800">
                    {s.title ?? sessionProfilesMap.get(s.customer_profile_id) ?? '—'}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(s.started_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium ${
                    s.status === 'completed' ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  {s.status === 'completed' ? 'Concluída' : 'Abandonada'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { requireAuth } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/actions/sessions'
import type { Metadata } from 'next'
import type { Database } from '@/types/database'

export const metadata: Metadata = { title: 'Treinar — Sales Trainer' }

type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row']
type TrainingSession = Database['public']['Tables']['training_sessions']['Row']

const difficultyLabel: Record<string, string> = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }
const difficultyColor: Record<string, string> = {
  easy: 'bg-green-50 text-green-700',
  medium: 'bg-yellow-50 text-yellow-700',
  hard: 'bg-red-50 text-red-700',
}
const scenarioLabel: Record<string, string> = {
  discovery: 'Discovery',
  objection_handling: 'Objeções',
  closing: 'Fechamento',
}

export default async function TrainPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: profilesRaw } = await supabase
    .from('customer_profiles')
    .select(
      'id, name, description, difficulty_level, scenario_type, buyer_role, visible_briefing, visit_objective, success_criteria',
    )
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const { data: sessionsRaw } = await supabase
    .from('training_sessions')
    .select('id, title, status, started_at, customer_profile_id')
    .eq('seller_id', user.id)
    .order('started_at', { ascending: false })
    .limit(5)

  const profiles = (profilesRaw ?? []) as Pick<
    CustomerProfile,
    'id' | 'name' | 'description' | 'difficulty_level' | 'scenario_type' | 'buyer_role'
    | 'visible_briefing' | 'visit_objective' | 'success_criteria'
  >[]

  const sessions = (sessionsRaw ?? []) as Pick<
    TrainingSession,
    'id' | 'title' | 'status' | 'started_at' | 'customer_profile_id'
  >[]

  // Busca nomes dos perfis das sessões recentes
  const profileIds = [...new Set(sessions.map((s) => s.customer_profile_id))]
  const { data: sessionProfilesRaw } = profileIds.length
    ? await supabase.from('customer_profiles').select('id, name').in('id', profileIds)
    : { data: [] }

  const sessionProfilesMap = new Map(
    (sessionProfilesRaw as { id: string; name: string }[] ?? []).map((p) => [p.id, p.name]),
  )

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-2 text-xl font-semibold">Escolha um cliente para simular</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Leia o briefing e o objetivo da visita antes de iniciar. O estilo comportamental do cliente
        será sorteado automaticamente pelo simulador.
      </p>

      {!profiles.length && (
        <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-sm text-neutral-500">Nenhum perfil disponível no momento.</p>
          <p className="mt-1 text-sm text-neutral-400">Aguarde seu gestor criar perfis de treino.</p>
        </div>
      )}

      <div className="grid gap-4">
        {profiles.map((p) => (
          <form key={p.id} action={createSession.bind(null, { customer_profile_id: p.id })}>
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  {p.buyer_role && (
                    <p className="text-xs text-neutral-400 mt-0.5">{p.buyer_role}</p>
                  )}
                  {p.description && (
                    <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {p.difficulty_level && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        difficultyColor[p.difficulty_level] ?? ''
                      }`}
                    >
                      {difficultyLabel[p.difficulty_level] ?? p.difficulty_level}
                    </span>
                  )}
                  {p.scenario_type && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                      {scenarioLabel[p.scenario_type] ?? p.scenario_type}
                    </span>
                  )}
                </div>
              </div>

              {(p.visible_briefing || p.visit_objective || p.success_criteria) && (
                <div className="mt-4 grid gap-3 border-t border-neutral-100 pt-4 text-sm sm:grid-cols-3">
                  {p.visible_briefing && (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase text-neutral-400">Briefing</p>
                      <p className="line-clamp-4 text-neutral-600">{p.visible_briefing}</p>
                    </div>
                  )}
                  {p.visit_objective && (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase text-neutral-400">Objetivo</p>
                      <p className="line-clamp-4 text-neutral-600">{p.visit_objective}</p>
                    </div>
                  )}
                  {p.success_criteria && (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase text-neutral-400">Sucesso</p>
                      <p className="line-clamp-4 text-neutral-600">{p.success_criteria}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  Iniciar simulação
                </button>
              </div>
            </div>
          </form>
        ))}
      </div>

      {sessions.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Sessões recentes</h2>
          <div className="space-y-2">
            {sessions.map((s) => (
              <a
                key={s.id}
                href={`/train/${s.id}`}
                className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-2.5 hover:bg-neutral-50"
              >
                <div>
                  <p className="text-sm">
                    {s.title ?? sessionProfilesMap.get(s.customer_profile_id) ?? '—'}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(s.started_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span
                  className={`text-xs ${
                    s.status === 'active'
                      ? 'text-green-600'
                      : s.status === 'completed'
                        ? 'text-neutral-500'
                        : 'text-neutral-400'
                  }`}
                >
                  {s.status === 'active'
                    ? 'Em andamento'
                    : s.status === 'completed'
                      ? 'Concluída'
                      : 'Abandonada'}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

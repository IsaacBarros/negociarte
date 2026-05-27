import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { PreSessionForm } from '@/components/train/PreSessionForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Conhecer cliente — Negociarte' }

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
  objection_handling: 'Tratamento de objeções',
  closing: 'Fechamento',
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>
}) {
  const { profileId } = await params
  const user = await requireAuth()
  const supabase = await createClient()

  // Verifica se seller tem sessão ativa (bloqueia nova sessão)
  const { data: activeSessionRaw } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('seller_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (activeSessionRaw) {
    const s = activeSessionRaw as { id: string }
    redirect(`/train/${s.id}`)
  }

  // Busca o perfil com dados de empresa e cliente
  const { data: profileRaw } = await supabase
    .from('customer_profiles')
    .select(
      'id, name, buyer_role, description, scenario_type, difficulty_level, available_objectives, ' +
      'visible_briefing, visit_objective, success_criteria, ' +
      'personality_traits, communication_style, ' +
      'company_id, customer_id',
    )
    .eq('id', profileId)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .single()

  if (!profileRaw) notFound()

  const profile = profileRaw as unknown as {
    id: string
    name: string
    buyer_role: string | null
    description: string | null
    scenario_type: string | null
    difficulty_level: 'easy' | 'medium' | 'hard' | 'trainee_choice' | null
    available_objectives: string[] | null
    visible_briefing: string | null
    visit_objective: string | null
    success_criteria: string | null
    personality_traits: string | null
    communication_style: string | null
    company_id: string | null
    customer_id: string | null
  }

  // Busca dados da empresa-alvo
  const { data: companyRaw } = profile.company_id
    ? await supabase
        .from('scenario_companies')
        .select('name, description, industry, company_size, market_situation')
        .eq('id', profile.company_id)
        .single()
    : { data: null }

  const company = companyRaw as {
    name: string
    description: string | null
    industry: string | null
    company_size: string | null
    market_situation: string | null
  } | null

  // Busca dados do cliente (pessoa)
  const { data: customerRaw } = profile.customer_id
    ? await supabase
        .from('scenario_customers')
        .select('name, description, buyer_role, personality_traits, communication_style')
        .eq('id', profile.customer_id)
        .single()
    : { data: null }

  const customer = customerRaw as {
    name: string
    description: string | null
    buyer_role: string | null
    personality_traits: string | null
    communication_style: string | null
  } | null

  // Busca histórico de relacionamento do seller com este cliente
  const { data: historyRaw } = profile.customer_id
    ? await supabase
        .from('seller_customer_history')
        .select('history_text')
        .eq('seller_id', user.id)
        .eq('customer_id', profile.customer_id)
        .maybeSingle()
    : { data: null }

  const relationshipHistory = (historyRaw as { history_text: string } | null)?.history_text ?? null

  const difficulty = profile.difficulty_level

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/train" className="hover:text-neutral-700">
          Treino
        </Link>
        <span>/</span>
        <span className="text-neutral-700">{profile.name}</span>
      </div>

      {/* Header do cenário */}
      <div className="mb-8 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {profile.scenario_type && scenarioLabel[profile.scenario_type] && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {scenarioLabel[profile.scenario_type]}
            </span>
          )}
          {difficulty && difficulty !== 'trainee_choice' && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                difficultyColor[difficulty] ?? ''
              }`}
            >
              {difficultyLabel[difficulty] ?? difficulty}
            </span>
          )}
          {difficulty === 'trainee_choice' && (
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">
              Dificuldade: você escolhe
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">{profile.name}</h1>
        {profile.buyer_role && (
          <p className="text-sm text-neutral-500">{profile.buyer_role}</p>
        )}
        {profile.description && (
          <p className="text-sm leading-relaxed text-neutral-600">{profile.description}</p>
        )}
      </div>

      <div className="space-y-5">
        {/* Empresa-alvo */}
        {company && (
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Empresa
            </h2>
            <p className="mb-1 font-medium text-neutral-900">{company.name}</p>
            {(company.industry ?? company.company_size) && (
              <p className="mb-2 text-xs text-neutral-500">
                {[company.industry, company.company_size].filter(Boolean).join(' · ')}
              </p>
            )}
            {company.description && (
              <p className="text-sm leading-relaxed text-neutral-600">{company.description}</p>
            )}
            {company.market_situation && (
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <p className="mb-1 text-xs font-medium text-neutral-400">Situação de mercado</p>
                <p className="text-sm leading-relaxed text-neutral-600">
                  {company.market_situation}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Perfil da pessoa */}
        {customer && (
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Quem você vai encontrar
            </h2>
            <p className="mb-0.5 font-medium text-neutral-900">{customer.name}</p>
            {customer.buyer_role && (
              <p className="mb-2 text-xs text-neutral-500">{customer.buyer_role}</p>
            )}
            {customer.description && (
              <p className="text-sm leading-relaxed text-neutral-600">{customer.description}</p>
            )}
            {(customer.personality_traits ?? customer.communication_style) && (
              <div className="mt-3 grid gap-3 border-t border-neutral-100 pt-3 sm:grid-cols-2">
                {customer.personality_traits && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-neutral-400">Personalidade</p>
                    <p className="text-sm leading-snug text-neutral-600">
                      {customer.personality_traits}
                    </p>
                  </div>
                )}
                {customer.communication_style && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-neutral-400">Comunicação</p>
                    <p className="text-sm leading-snug text-neutral-600">
                      {customer.communication_style}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Histórico de relacionamento */}
        {relationshipHistory && (
          <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">
              Histórico de relacionamento
            </h2>
            <p className="text-sm leading-relaxed text-blue-900">{relationshipHistory}</p>
          </section>
        )}

        {/* Contexto da visita */}
        {profile.visible_briefing && (
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Contexto da visita
            </h2>
            <p className="text-sm leading-relaxed text-neutral-700">{profile.visible_briefing}</p>
          </section>
        )}

        {/* Objetivo e critério de sucesso */}
        {(profile.visit_objective ?? profile.success_criteria) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.visit_objective && (
              <section className="rounded-xl border border-neutral-200 bg-white p-4">
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Objetivo do cenário
                </h2>
                <p className="text-sm leading-relaxed text-neutral-700">
                  {profile.visit_objective}
                </p>
              </section>
            )}
            {profile.success_criteria && (
              <section className="rounded-xl border border-neutral-200 bg-white p-4">
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Critério de sucesso
                </h2>
                <p className="text-sm leading-relaxed text-neutral-700">
                  {profile.success_criteria}
                </p>
              </section>
            )}
          </div>
        )}

        {/* Divisor */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-neutral-50 px-3 text-xs text-neutral-400">
              Configure sua simulação
            </span>
          </div>
        </div>

        {/* Formulário de objetivo + dificuldade */}
        <PreSessionForm
          profileId={profile.id}
          availableObjectives={profile.available_objectives}
          defaultDifficulty={difficulty}
        />
      </div>
    </div>
  )
}

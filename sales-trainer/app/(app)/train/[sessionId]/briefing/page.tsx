/**
 * Página de briefing — exibida apenas para sessões criadas pelo fluxo antigo
 * (sem objetivo pré-definido). Para novos fluxos, createSession redireciona
 * direto para /train/[sessionId].
 *
 * Se a sessão já tem chosen_objective, mostra confirmação e redireciona.
 */
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { SESSION_OBJECTIVE_LABELS, type SessionObjective } from '@/lib/schemas/session'
import { BriefingStartSection } from '@/components/train/BriefingStartSection'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Briefing — Negociarte' }

const difficultyLabel: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
}
const scenarioLabel: Record<string, string> = {
  discovery: 'Descoberta',
  objection_handling: 'Tratamento de objeções',
  closing: 'Fechamento',
}

export default async function BriefingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: sessionRaw } = await supabase
    .from('training_sessions')
    .select('id, status, customer_profile_id, difficulty_level, chosen_objective')
    .eq('id', sessionId)
    .eq('seller_id', user.id)
    .single()

  if (!sessionRaw) notFound()

  const session = sessionRaw as {
    id: string
    status: string
    customer_profile_id: string
    difficulty_level: string | null
    chosen_objective: string | null
  }

  // Sessão encerrada → vai para o chat/feedback
  if (session.status !== 'active') redirect(`/train/${sessionId}`)

  // Objetivo já definido → vai direto ao chat (briefing foi na tela anterior)
  if (session.chosen_objective) redirect(`/train/${sessionId}`)

  const { data: profileRaw } = await supabase
    .from('customer_profiles')
    .select(
      'name, buyer_role, customer_id, visible_briefing, visit_objective, success_criteria, scenario_type, difficulty_level, available_objectives',
    )
    .eq('id', session.customer_profile_id)
    .single()

  if (!profileRaw) notFound()

  const profile = profileRaw as {
    name: string
    buyer_role: string | null
    customer_id: string | null
    visible_briefing: string | null
    visit_objective: string | null
    success_criteria: string | null
    scenario_type: string | null
    difficulty_level: string | null
    available_objectives: string[] | null
  }

  // Histórico de relacionamento
  let relationshipHistory: string | null = null
  if (profile.customer_id) {
    const { data: historyRow } = await supabase
      .from('seller_customer_history')
      .select('history_text')
      .eq('seller_id', user.id)
      .eq('customer_id', profile.customer_id)
      .maybeSingle()
    relationshipHistory = historyRow?.history_text ?? null
  }

  const difficulty = session.difficulty_level ?? profile.difficulty_level
  const showDifficulty = difficulty && difficulty !== 'trainee_choice'
  const chosenObjectiveLabel = session.chosen_objective
    ? (SESSION_OBJECTIVE_LABELS[session.chosen_objective as SessionObjective] ??
      session.chosen_objective)
    : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Briefing da simulação
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">{profile.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {profile.buyer_role && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">
                {profile.buyer_role}
              </span>
            )}
            {profile.scenario_type && scenarioLabel[profile.scenario_type] && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
                {scenarioLabel[profile.scenario_type]}
              </span>
            )}
            {showDifficulty && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs ${
                  difficulty === 'hard'
                    ? 'bg-red-50 text-red-700'
                    : difficulty === 'medium'
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-green-50 text-green-700'
                }`}
              >
                {difficultyLabel[difficulty ?? ''] ?? difficulty}
              </span>
            )}
          </div>
        </div>

        {/* Objetivo escolhido */}
        {chosenObjectiveLabel && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Seu objetivo nesta visita
            </p>
            <p className="mt-0.5 text-sm font-medium text-blue-900">{chosenObjectiveLabel}</p>
          </div>
        )}

        {/* Histórico de relacionamento */}
        {relationshipHistory && (
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Histórico de relacionamento
            </h2>
            <p className="text-sm leading-relaxed text-neutral-700">{relationshipHistory}</p>
          </div>
        )}

        {/* Briefing */}
        {profile.visible_briefing && (
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Contexto da visita
            </h2>
            <p className="text-sm leading-relaxed text-neutral-700">{profile.visible_briefing}</p>
          </div>
        )}

        {/* Objetivo + Critério */}
        {(profile.visit_objective ?? profile.success_criteria) && (
          <div className="grid gap-4 md:grid-cols-2">
            {profile.visit_objective && (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Objetivo do cenário
                </h2>
                <p className="text-sm leading-relaxed text-neutral-700">
                  {profile.visit_objective}
                </p>
              </div>
            )}
            {profile.success_criteria && (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Critério de sucesso
                </h2>
                <p className="text-sm leading-relaxed text-neutral-700">
                  {profile.success_criteria}
                </p>
              </div>
            )}
          </div>
        )}

        {/* CTA — objetivo + botão iniciar (para sessões legadas sem objetivo) */}
        <BriefingStartSection
          sessionId={sessionId}
          initialObjective={session.chosen_objective as SessionObjective | null}
          availableObjectives={profile.available_objectives}
        />
      </div>
    </div>
  )
}

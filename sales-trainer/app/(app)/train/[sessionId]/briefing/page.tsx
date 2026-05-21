import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
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
    .select('id, status, customer_profile_id, difficulty_level')
    .eq('id', sessionId)
    .eq('seller_id', user.id)
    .single()

  if (!sessionRaw) notFound()

  const session = sessionRaw as {
    id: string
    status: string
    customer_profile_id: string
    difficulty_level: string | null
  }

  // Sessão já encerrada — redireciona para o chat/feedback
  if (session.status !== 'active') redirect(`/train/${sessionId}`)

  const { data: profileRaw } = await supabase
    .from('customer_profiles')
    .select('name, buyer_role, description, visible_briefing, visit_objective, success_criteria, scenario_type, difficulty_level')
    .eq('id', session.customer_profile_id)
    .single()

  if (!profileRaw) notFound()

  const profile = profileRaw as {
    name: string
    buyer_role: string | null
    description: string | null
    visible_briefing: string | null
    visit_objective: string | null
    success_criteria: string | null
    scenario_type: string | null
    difficulty_level: string | null
  }

  const difficulty = session.difficulty_level ?? profile.difficulty_level
  const showDifficulty = difficulty && difficulty !== 'trainee_choice'

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

        {/* Briefing */}
        {profile.visible_briefing && (
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Contexto da visita
            </h2>
            <p className="text-sm leading-relaxed text-neutral-700">{profile.visible_briefing}</p>
          </div>
        )}

        {/* Objective + Success */}
        {(profile.visit_objective ?? profile.success_criteria) && (
          <div className="grid gap-4 md:grid-cols-2">
            {profile.visit_objective && (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Objetivo
                </h2>
                <p className="text-sm leading-relaxed text-neutral-700">{profile.visit_objective}</p>
              </div>
            )}
            {profile.success_criteria && (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Critério de sucesso
                </h2>
                <p className="text-sm leading-relaxed text-neutral-700">{profile.success_criteria}</p>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/train"
            className="text-sm text-neutral-400 hover:text-neutral-700"
          >
            ← Voltar aos cenários
          </Link>
          <Link
            href={`/train/${sessionId}`}
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Estou pronto — iniciar conversa
          </Link>
        </div>
      </div>
    </div>
  )
}

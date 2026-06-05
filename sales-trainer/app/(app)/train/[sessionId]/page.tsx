import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { ChatWindow } from '@/components/chat/chat-window'
import { FeedbackCard } from '@/components/chat/feedback-card'
import { FeedbackPoller } from '@/components/chat/feedback-poller'
import { PostSessionActions } from '@/components/chat/PostSessionActions'
import type { UIMessage } from 'ai'
import type { Metadata } from 'next'
import type { Database } from '@/types/database'

export const metadata: Metadata = { title: 'Sessão de treino — Negociarte' }

type Feedback = Database['public']['Tables']['session_feedback']['Row']

export default async function SessionPage({
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

  const { data: profileRaw } = await supabase
    .from('customer_profiles')
    .select('id, name, buyer_role, visible_briefing, visit_objective, success_criteria, scenario_type')
    .eq('id', session.customer_profile_id)
    .single()

  if (!profileRaw) notFound()

  const profile = profileRaw as {
    id: string
    name: string
    buyer_role: string | null
    visible_briefing: string | null
    visit_objective: string | null
    success_criteria: string | null
    scenario_type: string | null
  }

  const { data: dbMessages } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  const initialMessages: UIMessage[] = (
    (dbMessages ?? []) as {
      id: string
      role: string
      content: string
      created_at: string
    }[]
  ).map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
    metadata: {},
    createdAt: new Date(m.created_at),
  }))

  const isEnded = session.status !== 'active'
  const isCompleted = session.status === 'completed'
  const isAbandoned = session.status === 'abandoned'

  let feedback: Feedback | null = null
  if (isCompleted) {
    const { data: fb } = await supabase
      .from('session_feedback')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle()
    feedback = fb as Feedback | null
  }

  return (
    <div className="relative flex h-screen flex-col">
      <ChatWindow
        sessionId={sessionId}
        profileName={profile.name}
        initialMessages={initialMessages}
        sessionEnded={isEnded}
        briefingContext={{
          buyerRole: profile.buyer_role,
          visibleBriefing: profile.visible_briefing,
          visitObjective: profile.visit_objective,
          successCriteria: profile.success_criteria,
          scenarioType: profile.scenario_type,
        }}
      />
      {isEnded && (
        <div className="absolute bottom-0 right-0 top-14 w-80 overflow-y-auto border-l border-neutral-200 bg-white p-4">
          {isAbandoned ? (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-medium text-neutral-800">Sessão abandonada</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Esta simulação foi encerrada sem avaliação. Relatórios por IA são gerados apenas
                quando você escolhe encerrar e avaliar.
              </p>
              <PostSessionActions
                customerProfileId={session.customer_profile_id}
                lastDifficultyLevel={session.difficulty_level}
              />
            </div>
          ) : feedback ? (
            <div className="space-y-6">
              <FeedbackCard feedback={feedback} />
              <PostSessionActions
                customerProfileId={session.customer_profile_id}
                lastDifficultyLevel={session.difficulty_level}
              />
            </div>
          ) : (
            <FeedbackPoller
              sessionId={sessionId}
              customerProfileId={session.customer_profile_id}
              lastDifficultyLevel={session.difficulty_level}
            />
          )}
        </div>
      )}
    </div>
  )
}

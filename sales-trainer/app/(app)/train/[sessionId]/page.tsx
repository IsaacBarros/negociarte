import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { ChatWindow } from '@/components/chat/chat-window'
import { FeedbackCard } from '@/components/chat/feedback-card'
import type { UIMessage } from 'ai'
import type { Metadata } from 'next'
import type { Database } from '@/types/database'

export const metadata: Metadata = { title: 'Sessão de treino — Sales Trainer' }

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
    .select('id, status, customer_profile_id')
    .eq('id', sessionId)
    .eq('seller_id', user.id)
    .single()

  if (!sessionRaw) notFound()

  const session = sessionRaw as { id: string; status: string; customer_profile_id: string }

  const { data: profileRaw } = await supabase
    .from('customer_profiles')
    .select('id, name')
    .eq('id', session.customer_profile_id)
    .single()

  if (!profileRaw) notFound()

  const profile = profileRaw as { id: string; name: string }

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

  let feedback: Feedback | null = null
  if (isEnded) {
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
      />
      {isEnded && feedback && (
        <div className="absolute bottom-0 right-0 top-14 w-80 overflow-y-auto border-l border-neutral-200 bg-white p-4">
          <FeedbackCard feedback={feedback} />
        </div>
      )}
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { FeedbackCard } from '@/components/chat/feedback-card'
import type { Metadata } from 'next'
import type { Database } from '@/types/database'

export const metadata: Metadata = { title: 'Transcrição — Negociarte' }

type Message = Database['public']['Tables']['messages']['Row']
type Feedback = Database['public']['Tables']['session_feedback']['Row']

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: sessionRaw } = await supabase
    .from('training_sessions')
    .select('id, title, status, started_at, ended_at, total_tokens, seller_id, customer_profile_id')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!sessionRaw) notFound()

  const session = sessionRaw as {
    id: string
    title: string | null
    status: string
    started_at: string
    ended_at: string | null
    total_tokens: number
    seller_id: string
    customer_profile_id: string
  }

  const [{ data: sellerRaw }, { data: profileRaw }, { data: messages }, { data: feedback }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.seller_id)
        .single(),
      supabase
        .from('customer_profiles')
        .select('name, difficulty_level, scenario_type')
        .eq('id', session.customer_profile_id)
        .single(),
      supabase
        .from('messages')
        .select('id, role, content, created_at, model_used')
        .eq('session_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('session_feedback')
        .select('*')
        .eq('session_id', id)
        .maybeSingle(),
    ])

  const sellerName =
    (sellerRaw as { full_name: string | null; email: string } | null)?.full_name ??
    (sellerRaw as { full_name: string | null; email: string } | null)?.email ??
    '—'

  const profileName = (profileRaw as { name: string } | null)?.name ?? '—'

  const duration =
    session.ended_at
      ? Math.round(
          (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000,
        )
      : null

  const typedMessages = (messages ?? []) as Pick<
    Message,
    'id' | 'role' | 'content' | 'created_at' | 'model_used'
  >[]

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Transcrição */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/admin/sessions" className="text-sm text-neutral-500 hover:text-neutral-900">
            ← Sessões
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{session.title ?? profileName}</h1>
          <div className="mt-1 flex gap-4 text-xs text-neutral-400">
            <span>Vendedor: {sellerName}</span>
            <span>Perfil: {profileName}</span>
            {duration !== null && <span>Duração: {duration} min</span>}
            <span>Tokens: {session.total_tokens.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-4">
          {typedMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-900'
                }`}
              >
                <p className="text-xs font-medium mb-1 opacity-60">
                  {msg.role === 'user' ? 'Vendedor' : `Cliente (${msg.model_used ?? 'IA'})`}
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="mt-1 text-xs opacity-40">
                  {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Painel de feedback */}
      <div className="w-80 shrink-0 overflow-y-auto border-l border-neutral-200 bg-white p-4">
        {feedback ? (
          <FeedbackCard feedback={feedback as Feedback} />
        ) : (
          <div className="pt-8 text-center text-sm text-neutral-400">
            {session.status === 'completed'
              ? 'Avaliação em processamento...'
              : 'Sessão ainda não encerrada.'}
          </div>
        )}
      </div>
    </div>
  )
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CreateSessionSchema, UpdateSessionStatusSchema } from '@/lib/schemas/session'

export async function createSession(rawInput: unknown, formData?: FormData) {
  const user = await requireAuth()
  const mergedInput =
    formData && formData.get('difficulty_level')
      ? {
          ...(rawInput as Record<string, unknown>),
          difficulty_level: formData.get('difficulty_level'),
        }
      : rawInput
  const { customer_profile_id, difficulty_level } = CreateSessionSchema.parse(mergedInput)

  const supabase = await createClient()

  const { data: profileRaw, error: profileError } = await supabase
    .from('customer_profiles')
    .select('id, name, difficulty_level')
    .eq('id', customer_profile_id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .single()

  if (profileError || !profileRaw) {
    throw new Error('Perfil não encontrado ou inativo.')
  }

  const profile = profileRaw as {
    id: string
    name: string
    difficulty_level: 'easy' | 'medium' | 'hard' | 'trainee_choice' | null
  }
  const sessionDifficulty =
    profile.difficulty_level === 'trainee_choice' ? difficulty_level ?? 'medium' : null

  const { data: behaviorStylesRaw } = await supabase
    .from('behavior_styles')
    .select('id')
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)

  const behaviorStyles = (behaviorStylesRaw ?? []) as { id: string }[]
  const randomBehaviorStyle =
    behaviorStyles.length > 0
      ? behaviorStyles[Math.floor(Math.random() * behaviorStyles.length)]
      : null

  const { data: sessionRaw, error } = await supabase
    .from('training_sessions')
    .insert({
      customer_profile_id,
      seller_id: user.id,
      organization_id: user.organization_id,
      title: `Treino com ${profile.name}`,
      behavior_style_id: randomBehaviorStyle?.id ?? null,
      difficulty_level: sessionDifficulty,
    })
    .select('id')
    .single()

  if (error || !sessionRaw) throw new Error('Erro ao criar sessão.')

  const session = sessionRaw as { id: string }
  redirect(`/train/${session.id}`)
}

export async function endSession(rawInput: unknown) {
  const user = await requireAuth()
  const { session_id, status } = UpdateSessionStatusSchema.parse(rawInput)

  const supabase = await createClient()

  const { error } = await supabase
    .from('training_sessions')
    .update({ status, ended_at: new Date().toISOString() })
    .eq('id', session_id)
    .eq('seller_id', user.id)
    .eq('status', 'active')

  if (error) throw new Error('Erro ao encerrar sessão.')

  if (status === 'completed' && process.env.N8N_WEBHOOK_URL) {
    await triggerEvaluation(session_id).catch(() => {
      // não bloqueia o fluxo principal
    })
  }

  revalidatePath('/train')
  revalidatePath(`/train/${session_id}`)
}

async function triggerEvaluation(sessionId: string) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  const secret = process.env.N8N_WEBHOOK_SECRET

  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-webhook-secret': secret } : {}),
    },
    body: JSON.stringify({ event: 'session.completed', session_id: sessionId }),
  })
}

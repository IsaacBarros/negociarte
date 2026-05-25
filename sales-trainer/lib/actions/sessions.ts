'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuth, requireAdmin } from '@/lib/actions/auth-helpers'
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

  const { count: activeCount } = await supabase
    .from('training_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', user.id)
    .eq('status', 'active')

  if ((activeCount ?? 0) > 0) {
    throw new Error('Você já tem uma sessão em andamento. Encerre-a antes de iniciar outra.')
  }

  const { data: profileRaw, error: profileError } = await supabase
    .from('customer_profiles')
    .select('id, name, difficulty_level, behavior_style_id')
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
    behavior_style_id: string | null
  }
  const sessionDifficulty =
    profile.difficulty_level === 'trainee_choice' ? difficulty_level ?? 'medium' : null

  // Usa o estilo fixo do perfil ou sorteia aleatoriamente
  let behaviorStyleId = profile.behavior_style_id
  if (!behaviorStyleId) {
    const { data: behaviorStylesRaw } = await supabase
      .from('behavior_styles')
      .select('id')
      .eq('organization_id', user.organization_id)
      .eq('is_active', true)

    const behaviorStyles = (behaviorStylesRaw ?? []) as { id: string }[]
    behaviorStyleId =
      behaviorStyles.length > 0
        ? (behaviorStyles[Math.floor(Math.random() * behaviorStyles.length)]?.id ?? null)
        : null
  }

  const { data: sessionRaw, error } = await supabase
    .from('training_sessions')
    .insert({
      customer_profile_id,
      seller_id: user.id,
      organization_id: user.organization_id,
      title: `Treino com ${profile.name}`,
      behavior_style_id: behaviorStyleId,
      difficulty_level: sessionDifficulty,
    })
    .select('id')
    .single()

  if (error || !sessionRaw) throw new Error('Erro ao criar sessão.')

  const session = sessionRaw as { id: string }
  redirect(`/train/${session.id}/briefing`)
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

  if (status === 'completed') {
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

    // Forward cookies para que o middleware reconheça a sessão autenticada
    const cookie = h.get('cookie') ?? ''

    // Aguarda o 202 (retorno rápido); avaliação roda em background via after() na route
    await fetch(`${proto}://${host}/api/evaluate-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ session_id }),
    }).catch((err) => console.error('[evaluate-session]', err))
  }

  revalidatePath('/train')
  revalidatePath(`/train/${session_id}`)
}

export async function abandonSessionAsAdmin(sessionId: string) {
  const user = await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('training_sessions')
    .update({ status: 'abandoned', ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('organization_id', user.organization_id)
    .eq('status', 'active')

  if (error) throw new Error('Erro ao encerrar sessão.')

  revalidatePath('/admin/sessions')
  revalidatePath(`/admin/sessions/${sessionId}`)
}

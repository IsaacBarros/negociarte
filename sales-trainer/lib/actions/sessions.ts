'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuth, requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CreateSessionSchema, UpdateSessionStatusSchema, UpdateObjectiveSchema, DeleteSessionsSchema } from '@/lib/schemas/session'

export async function createSession(rawInput: unknown) {
  const user = await requireAuth()
  const { customer_profile_id, difficulty_level, chosen_objective } =
    CreateSessionSchema.parse(rawInput)

  const supabase = await createClient()

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

  // Usa a dificuldade escolhida pelo seller; fallback para o padrão do perfil
  const sessionDifficulty: 'easy' | 'medium' | 'hard' =
    difficulty_level ??
    (profile.difficulty_level !== 'trainee_choice' && profile.difficulty_level
      ? profile.difficulty_level
      : 'medium')

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
      chosen_objective: chosen_objective ?? null,
    })
    .select('id')
    .single()

  if (error || !sessionRaw) throw new Error('Erro ao criar sessão.')

  const session = sessionRaw as { id: string }
  // Vai direto ao chat — objetivo e dificuldade já foram escolhidos na tela anterior
  redirect(`/train/${session.id}`)
}

export async function abandonActiveScenarioSession(customerProfileId: string) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: activeSessionsRaw, error: activeSessionError } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('seller_id', user.id)
    .eq('customer_profile_id', customerProfileId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })

  if (activeSessionError) {
    throw new Error('Erro ao verificar sessão ativa.')
  }

  const activeSessions = (activeSessionsRaw ?? []) as { id: string }[]

  if (activeSessions.length === 0) {
    throw new Error('Não há sessão ativa para este cenário.')
  }

  const activeSessionIds = activeSessions.map((session) => session.id)

  const { error: abandonError } = await supabase
    .from('training_sessions')
    .update({ status: 'abandoned', ended_at: new Date().toISOString() })
    .in('id', activeSessionIds)
    .eq('seller_id', user.id)
    .eq('customer_profile_id', customerProfileId)
    .eq('status', 'active')

  if (abandonError) {
    throw new Error('Erro ao abandonar a sessão ativa.')
  }

  revalidatePath('/train')
  for (const sessionId of activeSessionIds) {
    revalidatePath(`/train/${sessionId}`)
  }
  revalidatePath(`/train/cliente/${customerProfileId}`)
  redirect(`/train/cliente/${customerProfileId}`)
}

export async function updateSessionObjective(sessionId: string, rawInput: unknown) {
  const { chosen_objective } = UpdateObjectiveSchema.parse(rawInput)
  const user = await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase
    .from('training_sessions')
    .update({ chosen_objective })
    .eq('id', sessionId)
    .eq('seller_id', user.id)
    .eq('status', 'active')

  if (error) throw new Error('Erro ao salvar objetivo.')
  revalidatePath(`/train/${sessionId}/briefing`)
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

export async function deleteSessionsAsAdmin(rawInput: unknown) {
  const { session_ids } = DeleteSessionsSchema.parse(rawInput)
  const user = await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('training_sessions')
    .delete()
    .in('id', session_ids)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/sessions')
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

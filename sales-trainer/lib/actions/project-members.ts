'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'

const JoinByCodeSchema = z.object({
  code: z.string().min(8).max(64),
})

export type JoinProjectResult =
  | { success: true; company_id: string; company_name: string }
  | { success: false; error: 'invalid_code' | 'not_authenticated' | 'unknown' }

/**
 * Vincula o seller autenticado ao projeto identificado pelo join_code.
 * Usa uma função Postgres SECURITY DEFINER para contornar o RLS de
 * scenario_companies (que exige mesmo organization_id).
 */
export async function joinProjectByCode(rawInput: unknown): Promise<JoinProjectResult> {
  await requireAuth()
  const { code } = JoinByCodeSchema.parse(rawInput)
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('join_project_by_code', { p_code: code })

  if (error) {
    console.error('[joinProjectByCode]', error)
    return { success: false, error: 'unknown' }
  }

  const result = (data as unknown) as { error?: string; company_id?: string; company_name?: string } | null

  if (!result || result.error) {
    return {
      success: false,
      error: result?.error === 'invalid_code' ? 'invalid_code' : 'unknown',
    }
  }

  // Não chamamos revalidatePath aqui — esta action é invocada durante o render
  // de um Server Component (/join/[code]/page.tsx). O Next.js 16 proíbe
  // revalidatePath durante a fase de render. A navegação para /train após o
  // join já busca dados frescos naturalmente.

  return {
    success: true,
    company_id: result.company_id!,
    company_name: result.company_name!,
  }
}

/**
 * Retorna nome e id do projeto a partir do join_code.
 * Usado na join page para mostrar o nome antes de confirmar a vinculação.
 */
export async function getProjectByJoinCode(
  code: string,
): Promise<{ id: string; name: string } | null> {
  await requireAuth()
  const supabase = await createClient()

  const { data } = await supabase.rpc('get_project_by_join_code', { p_code: code })

  const rows = data as { id: string; name: string }[] | null | undefined
  return rows?.[0] ?? null
}

// ── Admin only ──────────────────────────────────────────────────────────────

const RegenerateSchema = z.object({
  company_id: z.string().uuid(),
})

/**
 * Gera um novo join_code para o projeto. Links antigos deixam de funcionar.
 * Apenas admins.
 */
export async function regenerateJoinCode(rawInput: unknown): Promise<{ join_code: string }> {
  const user = await requireAdmin()
  const { company_id } = RegenerateSchema.parse(rawInput)
  const supabase = await createClient()

  // Gera novo código (32 chars hex-like sem hífens)
  const newCode = crypto.randomUUID().replace(/-/g, '')

  const { data, error } = await supabase
    .from('scenario_companies')
    .update({ join_code: newCode })
    .eq('id', company_id)
    .eq('organization_id', user.organization_id)
    .select('join_code')
    .single()

  if (error || !data) throw new Error('Erro ao regenerar código.')

  const updated = data as { join_code: string }

  revalidatePath(`/admin/companies/${company_id}`)
  return { join_code: updated.join_code }
}

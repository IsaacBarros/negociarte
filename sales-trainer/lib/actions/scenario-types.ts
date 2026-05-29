'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'

const CreateSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e underscore'),
  label: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
})

export async function createScenarioType(rawInput: unknown) {
  const user = await requireAdmin()
  const input = CreateSchema.parse(rawInput)
  const supabase = await createClient()

  const { data: maxRow } = await supabase
    .from('scenario_types')
    .select('sort_order')
    .eq('organization_id', user.organization_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('scenario_types')
    .insert({
      organization_id: user.organization_id,
      key: input.key,
      label: input.label,
      description: input.description,
      sort_order: nextOrder,
    })
    .select('id, key, label, description, sort_order, is_active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('Já existe um tipo com essa chave.')
    throw new Error(error.message)
  }

  revalidatePath('/admin/settings')
  return data as { id: string; key: string; label: string; description: string; sort_order: number; is_active: boolean; created_at: string }
}

export async function deleteScenarioType(id: string) {
  const user = await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('scenario_types')
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/settings')
}

export async function updateScenarioType(id: string, rawInput: unknown) {
  const user = await requireAdmin()
  const input = CreateSchema.parse(rawInput)
  const supabase = await createClient()

  const { error } = await supabase
    .from('scenario_types')
    .update({ key: input.key, label: input.label, description: input.description })
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    if (error.code === '23505') throw new Error('Já existe um tipo com essa chave.')
    throw new Error(error.message)
  }

  revalidatePath('/admin/settings')
}

'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BehaviorStyleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(5).max(1000),
  simulation_guidance: z.string().min(10).max(3000),
  evaluation_criteria: z.string().max(2000).optional(),
  is_active: z.boolean().optional().default(true),
})

const ToggleSchema = z.object({
  style_id: z.string().uuid(),
  is_active: z.boolean(),
})

const DeleteSchema = z.object({
  style_id: z.string().uuid(),
})

/** Cria um novo behavior style */
export async function createBehaviorStyle(rawInput: unknown) {
  const user = await requireAdmin()
  const data = BehaviorStyleSchema.parse(rawInput)

  const supabase = await createClient()

  const { data: style, error } = await supabase
    .from('behavior_styles')
    .insert({
      organization_id: user.organization_id,
      ...data,
    })
    .select('id, name')
    .single()

  if (error || !style) throw new Error('Erro ao criar estilo de comportamento.')

  revalidatePath('/admin/companies')
  return style
}

/** Atualiza um behavior style existente */
export async function updateBehaviorStyle(styleId: string, rawInput: unknown) {
  const user = await requireAdmin()
  const data = BehaviorStyleSchema.parse(rawInput)

  const supabase = await createClient()

  const { error } = await supabase
    .from('behavior_styles')
    .update(data)
    .eq('id', styleId)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error('Erro ao atualizar estilo de comportamento.')

  revalidatePath('/admin/companies')
}

/** Ativa ou desativa um behavior style */
export async function toggleBehaviorStyle(rawInput: unknown) {
  const user = await requireAdmin()
  const { style_id, is_active } = ToggleSchema.parse(rawInput)

  const supabase = await createClient()

  const { error } = await supabase
    .from('behavior_styles')
    .update({ is_active })
    .eq('id', style_id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error('Erro ao atualizar estilo de comportamento.')

  revalidatePath('/admin/companies')
}

/** Remove um behavior style */
export async function deleteBehaviorStyle(rawInput: unknown) {
  const user = await requireAdmin()
  const { style_id } = DeleteSchema.parse(rawInput)

  const supabase = await createClient()

  const { error } = await supabase
    .from('behavior_styles')
    .delete()
    .eq('id', style_id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error('Erro ao remover estilo de comportamento.')

  revalidatePath('/admin/companies')
}

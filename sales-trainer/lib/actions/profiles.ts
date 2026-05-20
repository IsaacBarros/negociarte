'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CustomerProfileSchema } from '@/lib/schemas/profile'
import { compileSystemPrompt } from '@/lib/ai/profile-compiler'
import type { Database } from '@/types/database'

function toNullable<T>(v: T | undefined): T | null {
  return v ?? null
}

export async function createProfile(rawInput: unknown) {
  const user = await requireAdmin()
  const input = CustomerProfileSchema.parse(rawInput)

  const dbData: Database['public']['Tables']['customer_profiles']['Insert'] = {
    organization_id: user.organization_id,
    created_by: user.id,
    name: input.name,
    description: toNullable(input.description),
    buyer_role: null,
    industry: null,
    company_size: null,
    pain_points: null,
    objections: toNullable(input.objections),
    budget_context: toNullable(input.budget_context),
    decision_authority: null,
    personality_traits: null,
    communication_style: toNullable(input.communication_style),
    product_context: null,
    visible_briefing: toNullable(input.visible_briefing),
    visit_objective: toNullable(input.visit_objective),
    success_criteria: null,
    confidential_context: null,
    sales_process_context: null,
    sales_competencies_context: null,
    market_situation: null,
    competition_context: null,
    marketing_strategy: null,
    scenario_type: null,
    difficulty_level: null,
    is_active: input.is_active ?? true,
    system_prompt: '',
  }

  dbData.system_prompt = compileSystemPrompt(dbData)

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_profiles')
    .insert(dbData)
    .select('id')
    .single()

  if (error || !(data as { id?: string } | null)?.id) {
    throw new Error((error as { message?: string } | null)?.message ?? 'Erro ao criar perfil.')
  }

  revalidatePath('/admin/profiles')
  redirect(`/admin/profiles/${(data as { id: string }).id}`)
}

export async function updateProfile(id: string, rawInput: unknown) {
  const user = await requireAdmin()
  const input = CustomerProfileSchema.parse(rawInput)

  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (fetchError || !existing) throw new Error('Perfil não encontrado.')

  const updateData = {
    name: input.name,
    description: toNullable(input.description),
    buyer_role: null,
    industry: null,
    company_size: null,
    pain_points: null,
    objections: toNullable(input.objections),
    budget_context: toNullable(input.budget_context),
    decision_authority: null,
    personality_traits: null,
    communication_style: toNullable(input.communication_style),
    product_context: null,
    visible_briefing: toNullable(input.visible_briefing),
    visit_objective: toNullable(input.visit_objective),
    success_criteria: null,
    confidential_context: null,
    sales_process_context: null,
    sales_competencies_context: null,
    market_situation: null,
    competition_context: null,
    marketing_strategy: null,
    scenario_type: null,
    difficulty_level: null,
    is_active: input.is_active ?? true,
  }

  const merged = { ...existing, ...updateData }
  const system_prompt = compileSystemPrompt(merged)

  const { error } = await supabase
    .from('customer_profiles')
    .update({ ...updateData, system_prompt })
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/profiles')
  revalidatePath(`/admin/profiles/${id}`)
}

export async function toggleProfileActive(id: string, isActive: boolean) {
  await requireAdmin()

  const supabase = await createClient()
  const { error } = await supabase
    .from('customer_profiles')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/profiles')
}

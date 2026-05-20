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
    buyer_role: toNullable(input.buyer_role),
    industry: toNullable(input.industry),
    company_size: toNullable(input.company_size),
    pain_points: toNullable(input.pain_points),
    objections: toNullable(input.objections),
    budget_context: toNullable(input.budget_context),
    decision_authority: toNullable(input.decision_authority),
    personality_traits: toNullable(input.personality_traits),
    communication_style: toNullable(input.communication_style),
    product_context: toNullable(input.product_context),
    visible_briefing: toNullable(input.visible_briefing),
    visit_objective: toNullable(input.visit_objective),
    success_criteria: toNullable(input.success_criteria),
    confidential_context: toNullable(input.confidential_context),
    sales_process_context: toNullable(input.sales_process_context),
    sales_competencies_context: toNullable(input.sales_competencies_context),
    market_situation: toNullable(input.market_situation),
    competition_context: toNullable(input.competition_context),
    marketing_strategy: toNullable(input.marketing_strategy),
    scenario_type: toNullable(input.scenario_type),
    difficulty_level: toNullable(input.difficulty_level),
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
    buyer_role: toNullable(input.buyer_role),
    industry: toNullable(input.industry),
    company_size: toNullable(input.company_size),
    pain_points: toNullable(input.pain_points),
    objections: toNullable(input.objections),
    budget_context: toNullable(input.budget_context),
    decision_authority: toNullable(input.decision_authority),
    personality_traits: toNullable(input.personality_traits),
    communication_style: toNullable(input.communication_style),
    product_context: toNullable(input.product_context),
    visible_briefing: toNullable(input.visible_briefing),
    visit_objective: toNullable(input.visit_objective),
    success_criteria: toNullable(input.success_criteria),
    confidential_context: toNullable(input.confidential_context),
    sales_process_context: toNullable(input.sales_process_context),
    sales_competencies_context: toNullable(input.sales_competencies_context),
    market_situation: toNullable(input.market_situation),
    competition_context: toNullable(input.competition_context),
    marketing_strategy: toNullable(input.marketing_strategy),
    scenario_type: toNullable(input.scenario_type),
    difficulty_level: toNullable(input.difficulty_level),
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

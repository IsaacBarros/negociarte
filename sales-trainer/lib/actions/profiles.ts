'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CustomerProfileSchema, BulkProfileSchema } from '@/lib/schemas/profile'
import { compileSystemPrompt } from '@/lib/ai/profile-compiler'
import type { Database } from '@/types/database'

function toNullable<T>(v: T | undefined): T | null {
  return v === '' ? null : v ?? null
}

function productsToContext(products: unknown): string | null {
  if (!Array.isArray(products)) return null

  const lines = products
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const product = item as { name?: unknown; description?: unknown }
      const name = typeof product.name === 'string' ? product.name.trim() : ''
      const description =
        typeof product.description === 'string' ? product.description.trim() : ''
      if (!name && !description) return null
      return [name, description].filter(Boolean).join(': ')
    })
    .filter(Boolean)

  return lines.length ? lines.join('\n') : null
}

async function selectedEntityContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  companyId?: string,
  customerId?: string,
) {
  const [{ data: company }, { data: customer }] = await Promise.all([
    companyId
      ? supabase
          .from('scenario_companies')
          .select('*')
          .eq('id', companyId)
          .eq('organization_id', organizationId)
          .single()
      : { data: null },
    customerId
      ? supabase
          .from('scenario_customers')
          .select('*')
          .eq('id', customerId)
          .eq('organization_id', organizationId)
          .single()
      : { data: null },
  ])

  return { company, customer }
}

export async function createProfile(rawInput: unknown) {
  const user = await requireAdmin()
  const input = CustomerProfileSchema.parse(rawInput)
  const supabase = await createClient()
  const { company, customer } = await selectedEntityContext(
    supabase,
    user.organization_id,
    input.company_id,
    input.customer_id,
  )
  if (!company) throw new Error('Empresa não encontrada.')
  if (!customer) throw new Error('Cliente não encontrado.')

  const dbData: Database['public']['Tables']['customer_profiles']['Insert'] = {
    organization_id: user.organization_id,
    created_by: user.id,
    company_id: toNullable(input.company_id),
    customer_id: toNullable(input.customer_id),
    name: input.name,
    description: toNullable(input.description),
    buyer_role: toNullable(input.buyer_role) ?? customer?.buyer_role ?? null,
    industry: toNullable(input.industry) ?? company?.industry ?? null,
    company_size: toNullable(input.company_size) ?? company?.company_size ?? null,
    pain_points: toNullable(input.pain_points) ?? customer?.pain_points ?? null,
    objections: toNullable(input.objections) ?? customer?.objections ?? null,
    budget_context: toNullable(input.budget_context) ?? customer?.budget_context ?? null,
    decision_authority: toNullable(input.decision_authority) ?? customer?.decision_authority ?? null,
    personality_traits: toNullable(input.personality_traits) ?? customer?.personality_traits ?? null,
    communication_style: toNullable(input.communication_style) ?? customer?.communication_style ?? null,
    product_context:
      toNullable(input.product_context) ??
      company?.product_context ??
      productsToContext(company?.products_services) ??
      null,
    visible_briefing: toNullable(input.visible_briefing),
    visit_objective: toNullable(input.visit_objective),
    success_criteria: toNullable(input.success_criteria),
    confidential_context: toNullable(input.confidential_context) ?? customer?.confidential_context ?? null,
    sales_process_context: toNullable(input.sales_process_context),
    sales_competencies_context: toNullable(input.sales_competencies_context),
    market_situation: toNullable(input.market_situation) ?? company?.market_situation ?? null,
    competition_context: toNullable(input.competition_context) ?? company?.competition_context ?? null,
    marketing_strategy: toNullable(input.marketing_strategy) ?? company?.marketing_strategy ?? null,
    scenario_type: toNullable(input.scenario_type),
    difficulty_level: toNullable(input.difficulty_level),
    behavior_style_id: toNullable(input.behavior_style_id),
    chat_model: toNullable(input.chat_model),
    is_active: input.is_active ?? true,
    available_objectives: input.available_objectives ?? null,
    system_prompt: '',
  }

  dbData.system_prompt = compileSystemPrompt(dbData)

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
  const { company, customer } = await selectedEntityContext(
    supabase,
    user.organization_id,
    input.company_id,
    input.customer_id,
  )
  if (!company) throw new Error('Empresa não encontrada.')
  if (!customer) throw new Error('Cliente não encontrado.')

  const { data: existing, error: fetchError } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (fetchError || !existing) throw new Error('Perfil não encontrado.')

  const updateData = {
    company_id: toNullable(input.company_id),
    customer_id: toNullable(input.customer_id),
    name: input.name,
    description: toNullable(input.description),
    buyer_role: toNullable(input.buyer_role) ?? customer?.buyer_role ?? null,
    industry: toNullable(input.industry) ?? company?.industry ?? null,
    company_size: toNullable(input.company_size) ?? company?.company_size ?? null,
    pain_points: toNullable(input.pain_points) ?? customer?.pain_points ?? null,
    objections: toNullable(input.objections) ?? customer?.objections ?? null,
    budget_context: toNullable(input.budget_context) ?? customer?.budget_context ?? null,
    decision_authority: toNullable(input.decision_authority) ?? customer?.decision_authority ?? null,
    personality_traits: toNullable(input.personality_traits) ?? customer?.personality_traits ?? null,
    communication_style: toNullable(input.communication_style) ?? customer?.communication_style ?? null,
    product_context:
      toNullable(input.product_context) ??
      company?.product_context ??
      productsToContext(company?.products_services) ??
      null,
    visible_briefing: toNullable(input.visible_briefing),
    visit_objective: toNullable(input.visit_objective),
    success_criteria: toNullable(input.success_criteria),
    confidential_context: toNullable(input.confidential_context) ?? customer?.confidential_context ?? null,
    sales_process_context: toNullable(input.sales_process_context),
    sales_competencies_context: toNullable(input.sales_competencies_context),
    market_situation: toNullable(input.market_situation) ?? company?.market_situation ?? null,
    competition_context: toNullable(input.competition_context) ?? company?.competition_context ?? null,
    marketing_strategy: toNullable(input.marketing_strategy) ?? company?.marketing_strategy ?? null,
    scenario_type: toNullable(input.scenario_type),
    difficulty_level: toNullable(input.difficulty_level),
    behavior_style_id: toNullable(input.behavior_style_id),
    chat_model: toNullable(input.chat_model),
    is_active: input.is_active ?? true,
    available_objectives: input.available_objectives ?? null,
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

export async function archiveProfilesAsAdmin(rawInput: unknown) {
  const { profile_ids } = BulkProfileSchema.parse(rawInput)
  const user = await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('customer_profiles')
    .update({ is_active: false })
    .in('id', profile_ids)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/profiles')
}

export async function deleteProfilesAsAdmin(rawInput: unknown) {
  const { profile_ids } = BulkProfileSchema.parse(rawInput)
  const user = await requireAdmin()
  const supabase = await createClient()

  // Deleta sessões vinculadas primeiro (cascadeia messages + session_feedback)
  await supabase
    .from('training_sessions')
    .delete()
    .in('customer_profile_id', profile_ids)
    .eq('organization_id', user.organization_id)

  // Deleta os perfis
  const { error } = await supabase
    .from('customer_profiles')
    .delete()
    .in('id', profile_ids)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/profiles')
}

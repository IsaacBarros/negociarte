'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import {
  ScenarioCompanySchema,
  ScenarioCustomerSchema,
  QuickCompanySchema,
  QuickCustomerSchema,
} from '@/lib/schemas/scenario-entities'
import { compileSystemPrompt } from '@/lib/ai/profile-compiler'
import type { Database } from '@/types/database'

function toNullable<T>(v: T | undefined): T | null {
  return v === '' ? null : v ?? null
}

export async function createScenarioCompany(rawInput: unknown) {
  const user = await requireAdmin()
  const input = ScenarioCompanySchema.parse(rawInput)
  const supabase = await createClient()

  const data: Database['public']['Tables']['scenario_companies']['Insert'] = {
    organization_id: user.organization_id,
    created_by: user.id,
    name: input.name,
    description: toNullable(input.description),
    industry: toNullable(input.industry),
    company_size: toNullable(input.company_size),
    products_services: input.products_services ?? [],
    product_context: toNullable(input.product_context),
    market_situation: toNullable(input.market_situation),
    competition_context: toNullable(input.competition_context),
    marketing_strategy: toNullable(input.marketing_strategy),
    is_active: input.is_active ?? true,
    join_code: randomUUID().replace(/-/g, ''),
  }

  const { data: inserted, error } = await supabase
    .from('scenario_companies')
    .insert(data)
    .select('id')
    .single()
  if (error || !inserted) throw new Error(error?.message ?? 'Erro ao criar projeto')

  revalidatePath('/admin/companies')
  revalidatePath('/admin/profiles/new')
  redirect(`/admin/companies/${inserted.id}?tab=context&setup=1`)
}

export async function createScenarioCustomer(rawInput: unknown) {
  const user = await requireAdmin()
  const input = ScenarioCustomerSchema.parse(rawInput)
  const supabase = await createClient()

  const data: Database['public']['Tables']['scenario_customers']['Insert'] = {
    organization_id: user.organization_id,
    created_by: user.id,
    name: input.name,
    description: toNullable(input.description),
    buyer_role: toNullable(input.buyer_role),
    pain_points: toNullable(input.pain_points),
    objections: toNullable(input.objections),
    budget_context: toNullable(input.budget_context),
    decision_authority: toNullable(input.decision_authority),
    personality_traits: toNullable(input.personality_traits),
    communication_style: toNullable(input.communication_style),
    confidential_context: toNullable(input.confidential_context),
    is_active: input.is_active ?? true,
  }

  const { error } = await supabase.from('scenario_customers').insert(data)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/customers')
  revalidatePath('/admin/profiles/new')
  redirect('/admin/customers')
}

export async function createCompanyQuick(rawInput: unknown) {
  const user = await requireAdmin()
  const input = QuickCompanySchema.parse(rawInput)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scenario_companies')
    .insert({
      organization_id: user.organization_id,
      created_by: user.id,
      name: input.name,
      industry: toNullable(input.industry),
      company_size: toNullable(input.company_size),
      is_active: true,
      join_code: randomUUID().replace(/-/g, ''),
    })
    .select('id, name')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Erro ao criar empresa')
  revalidatePath('/admin/companies')
  return data
}

export async function createCustomerQuick(rawInput: unknown) {
  const user = await requireAdmin()
  const input = QuickCustomerSchema.parse(rawInput)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scenario_customers')
    .insert({
      organization_id: user.organization_id,
      created_by: user.id,
      name: input.name,
      buyer_role: toNullable(input.buyer_role),
      description: toNullable(input.description),
      pain_points: toNullable(input.pain_points),
      objections: toNullable(input.objections),
      budget_context: toNullable(input.budget_context),
      communication_style: toNullable(input.communication_style),
      is_active: true,
    })
    .select('id, name')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Erro ao criar cliente')
  revalidatePath('/admin/customers')
  return data
}

/** Atualiza apenas campos de contexto da empresa — sem redirect.
 *  Usado pelo AnalyzeKnowledgeDialog para pré-preencher após análise IA. */
export async function updateCompanyContext(id: string, rawInput: unknown) {
  const user = await requireAdmin()

  const ContextSchema = z.object({
    description: z.string().max(500).optional(),
    industry: z.string().max(200).optional(),
    company_size: z.string().max(200).optional(),
    product_context: z.string().max(1000).optional(),
    market_situation: z.string().max(2000).optional(),
    competition_context: z.string().max(2000).optional(),
    marketing_strategy: z.string().max(2000).optional(),
  })

  const input = ContextSchema.parse(rawInput)
  const supabase = await createClient()

  // Só atualiza os campos que foram fornecidos (patch parcial)
  const updateData: Database['public']['Tables']['scenario_companies']['Update'] = {}
  if (input.description !== undefined) updateData.description = toNullable(input.description)
  if (input.industry !== undefined) updateData.industry = toNullable(input.industry)
  if (input.company_size !== undefined) updateData.company_size = toNullable(input.company_size)
  if (input.product_context !== undefined) updateData.product_context = toNullable(input.product_context)
  if (input.market_situation !== undefined) updateData.market_situation = toNullable(input.market_situation)
  if (input.competition_context !== undefined) updateData.competition_context = toNullable(input.competition_context)
  if (input.marketing_strategy !== undefined) updateData.marketing_strategy = toNullable(input.marketing_strategy)

  if (Object.keys(updateData).length === 0) return

  const { error } = await supabase
    .from('scenario_companies')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/companies')
  revalidatePath(`/admin/companies/${id}`)
}

export async function updateScenarioCompany(id: string, rawInput: unknown) {
  const user = await requireAdmin()
  const input = ScenarioCompanySchema.parse(rawInput)
  const supabase = await createClient()

  const data: Database['public']['Tables']['scenario_companies']['Update'] = {
    name: input.name,
    description: toNullable(input.description),
    industry: toNullable(input.industry),
    company_size: toNullable(input.company_size),
    products_services: input.products_services ?? [],
    product_context: toNullable(input.product_context),
    market_situation: toNullable(input.market_situation),
    competition_context: toNullable(input.competition_context),
    marketing_strategy: toNullable(input.marketing_strategy),
    is_active: input.is_active ?? true,
  }

  const { error } = await supabase
    .from('scenario_companies')
    .update(data)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/companies')
  revalidatePath(`/admin/companies/${id}`)
  revalidatePath('/admin/profiles/new')
  redirect('/admin/companies')
}

export async function deleteCompanyAsAdmin(id: string) {
  const user = await requireAdmin()
  const supabase = await createClient()

  // 1. IDs dos customer_profiles desta empresa
  const { data: profileRows } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('company_id', id)
    .eq('organization_id', user.organization_id)

  const profileIds = (profileRows ?? []).map((p) => (p as { id: string }).id)

  // 2. Deleta training_sessions (ON DELETE RESTRICT workaround)
  if (profileIds.length > 0) {
    await supabase
      .from('training_sessions')
      .delete()
      .in('customer_profile_id', profileIds)
      .eq('organization_id', user.organization_id)
  }

  // 3. Deleta customer_profiles
  if (profileIds.length > 0) {
    await supabase
      .from('customer_profiles')
      .delete()
      .in('id', profileIds)
      .eq('organization_id', user.organization_id)
  }

  // 4. Entidades dependentes diretas da empresa (em paralelo)
  await Promise.all([
    supabase.from('company_knowledge_docs').delete().eq('company_id', id),
    supabase.from('evaluation_criteria').delete().eq('company_id', id),
    supabase.from('seller_companies').delete().eq('company_id', id),
  ])

  // 5. Deleta a empresa
  const { error } = await supabase
    .from('scenario_companies')
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/companies')
  redirect('/admin/companies')
}

export async function updateScenarioCustomer(id: string, rawInput: unknown) {
  const user = await requireAdmin()
  const input = ScenarioCustomerSchema.parse(rawInput)
  const supabase = await createClient()

  const data: Database['public']['Tables']['scenario_customers']['Update'] = {
    name: input.name,
    description: toNullable(input.description),
    buyer_role: toNullable(input.buyer_role),
    pain_points: toNullable(input.pain_points),
    objections: toNullable(input.objections),
    budget_context: toNullable(input.budget_context),
    decision_authority: toNullable(input.decision_authority),
    personality_traits: toNullable(input.personality_traits),
    communication_style: toNullable(input.communication_style),
    confidential_context: toNullable(input.confidential_context),
    is_active: input.is_active ?? true,
  }

  const { error } = await supabase
    .from('scenario_customers')
    .update(data)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${id}`)
  revalidatePath('/admin/profiles/new')
  redirect('/admin/customers')
}

const QuickProfileSchema = z.object({
  company_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  name: z.string().min(1).max(255),
  buyer_role: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  industry: z.string().max(255).optional(),
  company_size: z.string().max(255).optional(),
  pain_points: z.string().optional(),
  objections: z.string().optional(),
  budget_context: z.string().optional(),
  decision_authority: z.string().optional(),
  personality_traits: z.string().optional(),
  communication_style: z.string().max(255).optional(),
  product_context: z.string().optional(),
  market_situation: z.string().optional(),
  competition_context: z.string().optional(),
  marketing_strategy: z.string().optional(),
  visible_briefing: z.string().optional(),
  visit_objective: z.string().optional(),
  success_criteria: z.string().optional(),
  confidential_context: z.string().optional(),
  sales_process_context: z.string().optional(),
  sales_competencies_context: z.string().optional(),
  scenario_type: z.string().optional(),
  difficulty_level: z.enum(['easy', 'medium', 'hard', 'trainee_choice']).optional(),
  is_active: z.boolean().optional(),
})

/** Cria customer_profile programaticamente (a partir de geração IA ou análise de knowledge).
 *  Compila o system_prompt no servidor antes de inserir. Retorna { id, name }. */
export async function createProfileQuick(rawInput: unknown) {
  const user = await requireAdmin()
  const input = QuickProfileSchema.parse(rawInput)
  const supabase = await createClient()

  const insertData: Database['public']['Tables']['customer_profiles']['Insert'] = {
    organization_id: user.organization_id,
    created_by: user.id,
    name: input.name,
    company_id: toNullable(input.company_id),
    customer_id: toNullable(input.customer_id),
    buyer_role: toNullable(input.buyer_role),
    description: toNullable(input.description),
    industry: toNullable(input.industry),
    company_size: toNullable(input.company_size),
    pain_points: toNullable(input.pain_points),
    objections: toNullable(input.objections),
    budget_context: toNullable(input.budget_context),
    decision_authority: toNullable(input.decision_authority),
    personality_traits: toNullable(input.personality_traits),
    communication_style: toNullable(input.communication_style),
    product_context: toNullable(input.product_context),
    market_situation: toNullable(input.market_situation),
    competition_context: toNullable(input.competition_context),
    marketing_strategy: toNullable(input.marketing_strategy),
    visible_briefing: toNullable(input.visible_briefing),
    visit_objective: toNullable(input.visit_objective),
    success_criteria: toNullable(input.success_criteria),
    confidential_context: toNullable(input.confidential_context),
    sales_process_context: toNullable(input.sales_process_context),
    sales_competencies_context: toNullable(input.sales_competencies_context),
    scenario_type: toNullable(input.scenario_type),
    difficulty_level: input.difficulty_level ?? null,
    is_active: input.is_active ?? true,
    system_prompt: '',
  }

  insertData.system_prompt = compileSystemPrompt(insertData)

  const { data, error } = await supabase
    .from('customer_profiles')
    .insert(insertData)
    .select('id, name')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Erro ao criar cenário')

  revalidatePath('/admin/profiles')
  revalidatePath('/admin/companies')
  return data as { id: string; name: string }
}

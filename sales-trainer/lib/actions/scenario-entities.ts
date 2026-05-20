'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import {
  ScenarioCompanySchema,
  ScenarioCustomerSchema,
} from '@/lib/schemas/scenario-entities'
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
  }

  const { error } = await supabase.from('scenario_companies').insert(data)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/companies')
  revalidatePath('/admin/profiles/new')
  redirect('/admin/companies')
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

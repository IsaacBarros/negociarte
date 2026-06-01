'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BehaviorSchema = z.object({
  key: z.string().regex(/^[a-z_]+$/),
  label: z.string().min(2).max(200),
  weight: z.number().int().min(1),
})

const StageSchema = z.object({
  key: z.string().regex(/^[a-z_]+$/),
  label: z.string().min(2).max(200),
  behaviors: z.array(BehaviorSchema).min(1),
})

const CreateSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().min(2).max(200),
  stages: z.array(StageSchema).min(1),
  total_points: z.number().int().min(50).max(500),
})

const UpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200),
  stages: z.array(StageSchema).min(1),
  total_points: z.number().int().min(50).max(500),
})

/** Cria critério de avaliação para uma empresa (desativa o anterior) */
export async function createEvaluationCriteria(rawInput: unknown) {
  const user = await requireAdmin()
  const data = CreateSchema.parse(rawInput)

  const supabase = await createClient()

  // Verificar que a empresa pertence à org
  const { data: company, error: companyError } = await supabase
    .from('scenario_companies')
    .select('id')
    .eq('id', data.company_id)
    .eq('organization_id', user.organization_id)
    .single()

  if (companyError || !company) throw new Error('Empresa não encontrada.')

  // Desativar critérios ativos existentes para esta empresa
  await supabase
    .from('evaluation_criteria')
    .update({ is_active: false })
    .eq('company_id', data.company_id)
    .eq('is_active', true)

  // Criar novo critério ativo
  const { data: criteria, error } = await supabase
    .from('evaluation_criteria')
    .insert({
      organization_id: user.organization_id,
      company_id: data.company_id,
      name: data.name,
      stages: data.stages,
      total_points: data.total_points,
      is_active: true,
    })
    .select('id, name')
    .single()

  if (error || !criteria) throw new Error('Erro ao criar critério de avaliação.')

  revalidatePath('/admin/companies')
  return criteria
}

/** Atualiza critério de avaliação existente */
export async function updateEvaluationCriteria(rawInput: unknown) {
  const user = await requireAdmin()
  const data = UpdateSchema.parse(rawInput)

  const supabase = await createClient()

  const { error } = await supabase
    .from('evaluation_criteria')
    .update({
      name: data.name,
      stages: data.stages,
      total_points: data.total_points,
    })
    .eq('id', data.id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error('Erro ao atualizar critério de avaliação.')

  revalidatePath('/admin/companies')
}

const CustomCriterionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  text: z.string().max(10_000),
})

const UpdateCustomCriteriaSchema = z.object({
  criteria_id: z.string().uuid(),
  custom_criteria: z.array(CustomCriterionSchema),
})

/** Salva o array de critérios customizados (JSONB) de um critério existente */
export async function updateCustomCriteria(rawInput: unknown) {
  const user = await requireAdmin()
  const data = UpdateCustomCriteriaSchema.parse(rawInput)

  const supabase = await createClient()

  const { error } = await supabase
    .from('evaluation_criteria')
    .update({ custom_criteria: data.custom_criteria })
    .eq('id', data.criteria_id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error('Erro ao salvar critérios customizados.')

  revalidatePath('/admin/companies')
}

/** Ativa um critério (desativa os demais da mesma empresa) */
export async function activateEvaluationCriteria(criteriaId: string) {
  const user = await requireAdmin()

  const supabase = await createClient()

  // Buscar company_id do critério
  const { data: criteria, error: findError } = await supabase
    .from('evaluation_criteria')
    .select('company_id')
    .eq('id', criteriaId)
    .eq('organization_id', user.organization_id)
    .single()

  if (findError || !criteria) throw new Error('Critério não encontrado.')

  // Desativar todos da empresa
  await supabase
    .from('evaluation_criteria')
    .update({ is_active: false })
    .eq('company_id', criteria.company_id)
    .eq('organization_id', user.organization_id)

  // Ativar o selecionado
  await supabase
    .from('evaluation_criteria')
    .update({ is_active: true })
    .eq('id', criteriaId)
    .eq('organization_id', user.organization_id)

  revalidatePath('/admin/companies')
}

import { z } from 'zod'

const optionalText = (max: number) => z.string().max(max).optional()

export const ScenarioCompanySchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(100),
  description: optionalText(500),
  industry: optionalText(200),
  company_size: optionalText(200),
  products_services: z
    .array(
      z.object({
        name: z.string().max(120),
        description: z.string().max(1000),
      }),
    )
    .optional(),
  product_context: optionalText(1000),
  market_situation: optionalText(2000),
  competition_context: optionalText(2000),
  marketing_strategy: optionalText(2000),
  is_active: z.boolean().optional(),
})

export const ScenarioCustomerSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(100),
  description: optionalText(500),
  buyer_role: optionalText(200),
  pain_points: optionalText(2000),
  objections: optionalText(2000),
  budget_context: optionalText(500),
  decision_authority: optionalText(1000),
  personality_traits: optionalText(1000),
  communication_style: optionalText(500),
  confidential_context: optionalText(2000),
  is_active: z.boolean().optional(),
})

export type ScenarioCompanyInput = z.infer<typeof ScenarioCompanySchema>
export type ScenarioCustomerInput = z.infer<typeof ScenarioCustomerSchema>

export const QuickCompanySchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(100),
  industry: optionalText(200),
  company_size: optionalText(200),
})

export const QuickCustomerSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(100),
  buyer_role: optionalText(200),
  description: optionalText(500),
})

export type QuickCompanyInput = z.infer<typeof QuickCompanySchema>
export type QuickCustomerInput = z.infer<typeof QuickCustomerSchema>

import { z } from 'zod'

export const CustomerProfileSchema = z.object({
  company_id: z.string().uuid('Selecione uma empresa'),
  customer_id: z.string().uuid().optional(),
  name: z.string().min(2, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  buyer_role: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
  company_size: z.string().max(200).optional(),
  pain_points: z.string().max(2000).optional(),
  objections: z.string().max(2000).optional(),
  budget_context: z.string().max(500).optional(),
  decision_authority: z.string().max(1000).optional(),
  personality_traits: z.string().max(1000).optional(),
  communication_style: z.string().max(500).optional(),
  product_context: z.string().max(1000).optional(),
  visible_briefing: z.string().max(2000).optional(),
  visit_objective: z.string().max(1000).optional(),
  success_criteria: z.string().max(1000).optional(),
  confidential_context: z.string().max(2000).optional(),
  sales_process_context: z.string().max(2000).optional(),
  sales_competencies_context: z.string().max(2000).optional(),
  market_situation: z.string().max(2000).optional(),
  competition_context: z.string().max(2000).optional(),
  marketing_strategy: z.string().max(2000).optional(),
  scenario_type: z.string().max(100).optional(),
  difficulty_level: z.enum(['easy', 'medium', 'hard', 'trainee_choice']).optional(),
  behavior_style_id: z.string().uuid().optional(),
  chat_model: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  available_objectives: z.array(z.string().min(1).max(500)).nullable().optional(),
  system_prompt: z.string().optional(),
})

export const BulkProfileSchema = z.object({
  profile_ids: z.array(z.string().uuid()).min(1).max(200),
})

export type CustomerProfileInput = z.infer<typeof CustomerProfileSchema>
export type BulkProfileInput = z.infer<typeof BulkProfileSchema>

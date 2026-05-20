import { z } from 'zod'

export const CustomerProfileSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  communication_style: z.string().max(500).optional(), // Estilo de Comportamento
  visible_briefing: z.string().max(2000).optional(), // Contexto de Compra
  budget_context: z.string().max(500).optional(), // Valor Disponível
  objections: z.string().max(2000).optional(), // Objeções Típicas
  visit_objective: z.string().max(1000).optional(), // Objetivo da Visita
  is_active: z.boolean().optional(),
})

export type CustomerProfileInput = z.infer<typeof CustomerProfileSchema>

import { z } from 'zod'

export const SESSION_OBJECTIVES = [
  'conquistar',
  'aumentar_vendas',
  'melhorar_relacionamento',
  'reconquistar',
  'outro',
] as const

export type SessionObjective = (typeof SESSION_OBJECTIVES)[number]

export const SESSION_OBJECTIVE_LABELS: Record<SessionObjective, string> = {
  conquistar: 'Conquistar este cliente (1º negócio)',
  aumentar_vendas: 'Aumentar o volume de vendas',
  melhorar_relacionamento: 'Melhorar o relacionamento',
  reconquistar: 'Reconquistar cliente perdido ou inativo',
  outro: 'Outro objetivo',
}

export const CreateSessionSchema = z.object({
  customer_profile_id: z.string().uuid(),
  difficulty_level: z.enum(['easy', 'medium', 'hard']).optional(),
  chosen_objective: z.enum(SESSION_OBJECTIVES).optional(),
})

export const UpdateSessionStatusSchema = z.object({
  session_id: z.string().uuid(),
  status: z.enum(['completed', 'abandoned']),
})

export const UpdateObjectiveSchema = z.object({
  chosen_objective: z.enum(SESSION_OBJECTIVES),
})

export const DeleteSessionsSchema = z.object({
  session_ids: z.array(z.string().uuid()).min(1).max(100),
})

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>
export type UpdateSessionStatusInput = z.infer<typeof UpdateSessionStatusSchema>
export type UpdateObjectiveInput = z.infer<typeof UpdateObjectiveSchema>
export type DeleteSessionsInput = z.infer<typeof DeleteSessionsSchema>

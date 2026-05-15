import { z } from 'zod'

export const CreateSessionSchema = z.object({
  customer_profile_id: z.string().uuid(),
})

export const UpdateSessionStatusSchema = z.object({
  session_id: z.string().uuid(),
  status: z.enum(['completed', 'abandoned']),
})

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>
export type UpdateSessionStatusInput = z.infer<typeof UpdateSessionStatusSchema>

import { z } from 'zod'

const envSchema = z.object({
  // Supabase (public — acessível no browser via NEXT_PUBLIC_)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Supabase service role (apenas servidor)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // OpenRouter (apenas servidor)
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_CHAT_MODEL: z.string().min(1).default('anthropic/claude-sonnet-4.5'),
  OPENROUTER_EVAL_MODEL: z.string().min(1).default('openai/gpt-4o-mini'),
  OPENROUTER_SUGGEST_MODEL: z.string().min(1).default('openai/gpt-4o-mini'),

  // App
  APP_URL: z.string().url().default('http://localhost:3000'),

  // n8n
  N8N_WEBHOOK_URL: z.string().url().optional(),
  N8N_WEBHOOK_SECRET: z.string().min(1).optional(),
})

type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Missing or invalid environment variables: ${missing}`)
  }
  return result.data
}

// Lançar erro no startup se env estiver incompleta (apenas no servidor)
export const env = typeof window === 'undefined' ? validateEnv() : ({} as Env)

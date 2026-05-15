# CLAUDE.md — lib/

## Organização da camada de domínio

```
lib/
├── supabase/    # clientes Supabase (server vs client)
├── ai/          # wrappers de LLM, compilador de perfil, evaluator
├── actions/     # Server Actions
├── schemas/     # Zod schemas (validação de formulários e API)
└── env.ts       # validação de variáveis de ambiente
```

## lib/supabase/

- `server.ts` — use em Server Components, Server Actions e Route Handlers
- `client.ts` — use em Client Components com `"use client"`
- **Nunca** use o cliente de servidor em Client Components e vice-versa

## lib/ai/

- `openrouter.ts` — instância do provider (apenas servidor)
- `models.ts` — resolução de modelo por purpose (`modelFor('chat')`)
- `profile-compiler.ts` — transforma `CustomerProfile` em `system_prompt` (função pura)
- `evaluator.ts` — gera feedback estruturado de uma sessão

## lib/actions/

Todo Server Action OBRIGATORIAMENTE segue este padrão:

```ts
'use server'

export async function minhaAction(rawInput: unknown) {
  // 1. Validar input (sempre com Zod)
  const input = MinhaSchema.parse(rawInput)

  // 2. Autenticação
  const user = await requireAuth()

  // 3. Autorização (quando necessário)
  await requireAdmin(user)

  // 4. Lógica de negócio
  const db = await createServerClient()
  // ...

  // 5. Revalidar cache se necessário
  revalidatePath('/...')
}
```

Use `requireAuth` e `requireAdmin` de `@/lib/actions/auth-helpers`.

## lib/schemas/

Schemas Zod são a única fonte da verdade para validação. O mesmo schema valida o formulário (frontend via `zodResolver`) e o Server Action (backend via `.parse()`). Nunca duplique regras de validação.

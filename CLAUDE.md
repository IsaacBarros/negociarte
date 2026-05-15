# CLAUDE.md — Negociarte / Sales Trainer

Convenções globais para o projeto. Leia antes de qualquer tarefa.

## Comandos essenciais

```bash
pnpm dev          # dev server (localhost:3000)
pnpm build        # build de produção
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest
pnpm test:e2e     # playwright
pnpm db:types     # supabase gen types typescript --linked > types/database.ts
pnpm db:migrate   # supabase db push
```

## Stack

- **Framework:** Next.js 15 (App Router) — RSC por padrão, `"use client"` só quando necessário
- **Linguagem:** TypeScript strict — ver `tsconfig.json`
- **Estilo:** Tailwind CSS + shadcn/ui (componentes em `components/ui/`)
- **Banco:** Supabase (Postgres + Auth + RLS)
- **LLM Gateway:** OpenRouter via Vercel AI SDK (`@openrouter/ai-sdk-provider`)
- **Workflows assíncronos:** n8n (avaliação, notificações, integrações)
- **Deploy:** Vercel

## Imports

Sempre use o alias `@/` — nunca caminhos relativos com `../`:

```ts
// Correto
import { createClient } from '@/lib/supabase/server'
import { modelFor } from '@/lib/ai/models'

// Errado
import { createClient } from '../../lib/supabase/server'
```

## TypeScript

- `strict: true` obrigatório — não desabilite nenhuma flag
- **Nunca use `any`** — use `unknown` quando o tipo for indeterminado
- `noUncheckedIndexedAccess` está ativo — trate acessos a arrays/objetos como possivelmente `undefined`
- Tipos do Supabase são gerados — use `Database` de `@/types/database` para tipar queries

## Supabase

- **RLS habilitada em todas as tabelas sem exceção** — nunca crie tabela sem policy
- `service_role` key só em código de servidor (migrations, scripts seed) — jamais em Client Components ou variáveis `NEXT_PUBLIC_`
- Use `@/lib/supabase/server` em Server Components e Server Actions
- Use `@/lib/supabase/client` em Client Components
- Toda query é filtrada por `organization_id` via RLS — não filtre manualmente no código se a policy já faz isso

## OpenRouter / LLM

- **Nunca chame o OpenRouter no browser** — toda chamada de LLM é server-side
- A `OPENROUTER_API_KEY` nunca tem prefixo `NEXT_PUBLIC_`
- Use `modelFor(purpose)` de `@/lib/ai/models` para resolver o nome do modelo — nunca hardcode strings como `"anthropic/claude-3.5-sonnet"` fora de env vars
- Grave `model_used` em toda resposta de IA para rastreabilidade

## Server Actions

Todo Server Action em `lib/actions/` segue este padrão obrigatório:

```ts
export async function minhaAction(input: unknown) {
  // 1. Validar input
  const data = MinhaSchema.parse(input)

  // 2. Checar autenticação
  const user = await requireAuth()

  // 3. Checar role/permissão se necessário
  await requireAdmin(user)

  // 4. Executar lógica
  // ...
}
```

Use os helpers `requireAuth` e `requireAdmin` de `@/lib/actions/auth-helpers` — nunca esqueça essas verificações.

## Commits

Conventional Commits obrigatório:

```
feat: adiciona builder de perfil de cliente
fix: corrige streaming no Safari
chore: atualiza dependências
refactor: extrai helper requireAdmin
docs: atualiza ADR-0002
```

Escopo opcional entre parênteses: `feat(chat): implementa composer com auto-resize`.

## O que nunca fazer

- Nunca consulte o Supabase sem RLS habilitada na tabela
- Nunca use `any` — use `unknown` ou o tipo correto
- Nunca exponha `OPENROUTER_API_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` ao browser
- Nunca hardcode strings de modelo de IA — use `modelFor()` ou env vars
- Nunca faça chamadas ao OpenRouter no cliente (browser)
- Nunca chame uma Server Action sem validar o input com Zod primeiro
- Nunca chame uma Server Action sem checar autenticação

## Estrutura do Projeto

```
Negociarte/                        ← raiz do monorepo
├── CLAUDE.md                      ← este arquivo
├── docs/adr/                      ← decisões de arquitetura (ADR-0001…)
└── sales-trainer/                 ← aplicação Next.js
    ├── app/
    │   ├── (auth)/login|signup    ← fluxo de autenticação
    │   ├── (app)/                 ← área autenticada
    │   │   ├── page.tsx           ← dashboard (escolha de perfil)
    │   │   ├── train/
    │   │   │   ├── page.tsx       ← lista de sessões do seller
    │   │   │   └── [sessionId]/   ← chat + feedback da sessão
    │   │   └── admin/
    │   │       ├── profiles/      ← CRUD de perfis de cliente
    │   │       ├── sessions/      ← visão geral de sessões
    │   │       └── analytics/     ← métricas e relatórios
    │   └── api/chat/route.ts      ← streaming SSE → OpenRouter
    ├── components/
    │   ├── ui/                    ← shadcn — não modificar
    │   ├── chat/                  ← ChatWindow, MessageList, Composer, FeedbackCard
    │   ├── profile-builder/       ← BuilderForm, PromptPreview
    │   └── sidebar/               ← AppSidebar
    ├── lib/
    │   ├── supabase/server|client ← clientes Supabase por contexto
    │   ├── ai/
    │   │   ├── models.ts          ← modelFor('chat'|'evaluation'|'suggestion')
    │   │   ├── openrouter.ts      ← instância do provider (server-only)
    │   │   ├── evaluator.ts       ← gera feedback estruturado pós-sessão
    │   │   ├── profile-compiler.ts← CustomerProfile → system_prompt (função pura)
    │   │   └── prompts/           ← templates de prompt (persona, evaluator)
    │   ├── actions/
    │   │   ├── auth-helpers.ts    ← requireAuth, requireAdmin
    │   │   ├── sessions.ts        ← createSession, endSession
    │   │   └── profiles.ts        ← CRUD de customer_profiles
    │   └── schemas/               ← Zod (fonte única de verdade para validação)
    ├── supabase/migrations/       ← 0001…0004 — histórico do schema
    └── types/database.ts          ← gerado por `pnpm db:types`
```

## Schema do Banco

| Tabela | Descrição |
|---|---|
| `organizations` | Multi-tenant root — toda entidade pertence a uma org |
| `profiles` | Usuários da aplicação; `role = 'admin' \| 'seller'` |
| `customer_profiles` | Personas de cliente criadas pelos admins para simulação |
| `training_sessions` | Sessão de treino de um seller com uma persona; `status = 'active' \| 'completed' \| 'abandoned'` |
| `messages` | Mensagens individuais da conversa; grava `model_used` |
| `session_feedback` | Avaliação gerada pelo n8n ao encerrar a sessão; `score 1–10` |

RLS garante isolamento por `organization_id` em todas as tabelas.

## Mapa de Rotas

| Rota | Papel | O que faz |
|---|---|---|
| `/login`, `/signup` | público | autenticação via Supabase Auth |
| `/` (app) | seller + admin | escolha de perfil e início de sessão |
| `/train` | seller | lista de sessões do seller |
| `/train/[sessionId]` | seller | chat em tempo real + feedback ao encerrar |
| `/admin/profiles` | admin | lista de customer_profiles |
| `/admin/profiles/new` | admin | formulário de criação de perfil |
| `/admin/profiles/[id]` | admin | edição de perfil |
| `/admin/sessions` | admin | visão geral de todas as sessões da org |
| `/admin/analytics` | admin | métricas e relatórios |
| `POST /api/chat` | seller (autenticado) | streaming SSE → OpenRouter |

## Zonas Críticas

**`/api/chat/route.ts`** — endpoint de streaming; qualquer erro aqui quebra o chat em tempo real. Nunca adicione I/O bloqueante sem testar latência.

**`lib/actions/auth-helpers.ts`** — `requireAuth` e `requireAdmin` são a linha de defesa de autenticação. Toda Server Action usa esses helpers — não crie atalhos.

**`lib/ai/profile-compiler.ts`** — transforma dados do admin em `system_prompt` injetado no chat. Mudanças aqui afetam a qualidade de todas as simulações.

**`supabase/migrations/`** — migrações são irreversíveis em produção. Teste com `pnpm db:migrate` em ambiente local antes de commitar.

**`lib/ai/models.ts`** — ponto central de resolução de modelo. Mudanças aqui afetam custo, latência e qualidade de todas as chamadas de IA.

## Fluxo de Avaliação (n8n)

```
seller encerra sessão
  → endSession() atualiza status = 'completed'
  → dispara POST N8N_WEBHOOK_URL com sessionId + N8N_WEBHOOK_SECRET
  → n8n busca transcrição no Supabase
  → n8n chama OpenRouter (OPENROUTER_EVAL_MODEL)
  → n8n grava session_feedback no Supabase
  → seller vê FeedbackCard na página da sessão
```

O n8n **não fica no caminho crítico do chat** (ADR-0003).

## Referências

- Decisões de arquitetura: `docs/adr/`
- Convenções de componentes: `sales-trainer/components/CLAUDE.md`
- Convenções da camada de domínio: `sales-trainer/lib/CLAUDE.md`
- Knowledge base do projeto: `.claude/knowledge/`

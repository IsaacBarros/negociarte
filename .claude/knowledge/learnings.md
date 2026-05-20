# Learnings — Sales Trainer

Registro cronológico de aprendizados, decisões não-óbvias e contexto acumulado durante o desenvolvimento. Cada entrada tem data e categoria.

---

## 2026-05-14 — Bootstrap inicial

**Categoria:** Arquitetura

Knowledge base inicializada. Análise completa do projeto realizada. Pontos não-óbvios identificados:

- O app usa **Next.js 16.2.6** (não 15 como citado em alguns lugares do CLAUDE.md raiz) com React 19.
- `pnpm-workspace.yaml` existe na raiz de `sales-trainer/` — o projeto está preparado para ser monorepo internamente, mas por ora tem apenas um pacote (`sales-trainer`).
- O `system_prompt` do customer_profile é **compilado no momento da criação do perfil** (não em runtime do chat) via `profile-compiler.ts`. Mudanças no template de compilação não afetam sessões existentes.
- `session_feedback` tem constraint `unique` em `session_id` — cada sessão gera exatamente um feedback. Se o n8n tentar reavaliar, vai dar conflito.
- O campo `techniques_used` e `techniques_missed` em `session_feedback` são `text[]` — arrays Postgres. Não são IDs de uma tabela de técnicas; são strings livres geradas pela IA de avaliação.
- `total_tokens` em `training_sessions` é acumulado manualmente (não calculado automaticamente). Verificar se está sendo somado corretamente nas chamadas de chat.
- A rota `/api/chat` ainda não aparece como arquivo — pode ainda não ter sido criada ou estar em uma pasta não mapeada. Confirmar antes de assumir que existe.

---

## 2026-05-14 — Auth, RLS e chat desbloqueados

**Categoria:** Bug

Sessão focada em desbloquear o fluxo inicial do MVP: criar conta, acessar área admin, criar perfis e iniciar chat. O loop/retorno para login não era problema de senha: Supabase Auth autenticava corretamente, mas a leitura de `public.profiles` falhava.

O erro diagnóstico `42P17` revelou recursão nas policies RLS: policies de `profiles` consultavam a própria tabela `profiles`, fazendo o Postgres reaplicar RLS indefinidamente. A correção foi versionada em `supabase/migrations/0005_fix_recursive_rls.sql`, com funções `security definer` (`current_user_organization_id()` e `current_user_is_admin(...)`) para consultar papel/organização sem passar pela policy recursiva. Decisão: corrigir RLS no banco, não bypassar autorização no app.

Também foi atualizado o fluxo Next.js 16 de `middleware.ts` para `proxy.ts`, removendo o warning da convenção antiga e preservando o refresh de sessão do Supabase. A tela de login ganhou diagnóstico temporário com `reason=` para diferenciar perfil ausente de erro RLS; pendência: remover ou suavizar essa mensagem quando o fluxo estiver estável.

No chat, o `POST /api/chat 400` vinha de incompatibilidade com o AI SDK v6: `DefaultChatTransport` envia `UIMessage` com `parts`, não mensagens `{ role, content }`. A rota agora precisa converter `UIMessage[]` com `convertToModelMessages()` e responder com `toUIMessageStreamResponse()`, não `toTextStreamResponse()`. Isso é importante para qualquer manutenção futura do chat.

O modelo `anthropic/claude-3.5-sonnet` retornou 404 no OpenRouter (`No endpoints found`). O `.env.local` e os defaults foram atualizados para `anthropic/claude-sonnet-4.5`. Pendência: reiniciar `npm run dev` após mudança em `.env.local` e testar o fluxo completo `login -> admin/profiles -> train -> chat -> messages/total_tokens`.

Problemas novos registrados: `tsc --noEmit` e `eslint` ficaram presos sem saída no ambiente local; há uso recorrente de `any` em actions e route handlers, em conflito com as regras do projeto; docs/ADR ainda citam Next.js 15 apesar de o app real estar em Next.js 16.2.6.

---

## 2026-05-20 — Resolução de Typescript & ESLint (Remoção de 'any')

**Categoria:** Bug | Arquitetura

O uso de `as any` no cliente do Supabase existia devido a uma incompatibilidade entre a versão do `@supabase/supabase-js` (que exige a propriedade `Relationships` em `GenericTable`) e o esquema gerado por versões mais antigas do Supabase CLI (que não geravam a propriedade `Relationships`).
Isso fazia com que o TypeScript inferisse os métodos de tabela como `never`, forçando os desenvolvedores anteriores a usar castings e silenciar o linter.
Injetar `Relationships: []` no tipo gerado em `types/database.ts` resolveu a raiz do problema, permitindo a remoção completa de `as any` em todas as actions (`profiles.ts`, `sessions.ts`, `route.ts` de webhook do n8n) com tipagem 100% segura e passando no compile production (`next build`) sem desrespeitar o linter.

Também adicionamos o diretório `.next-dev/**` aos ignores do ESLint (`eslint.config.mjs`) para evitar que arquivos temporários gerados em desenvolvimento poluam o output do linter.

<!-- Nova entrada: copie o bloco abaixo e preencha -->
<!--
## YYYY-MM-DD — Título curto

**Categoria:** Arquitetura | Banco | IA | Auth | UI | Ops | Bug

Descrição do aprendizado. Foco no **por que**, não no **o que** (o código já diz o que).
-->

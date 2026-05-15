# Sessão 2026-05-14 — Auth, RLS e chat

## O que foi feito

- Diagnóstico de loop/requisições repetidas em `/`: a página raiz redirecionava para `/train` ou `/admin/profiles`, mas usuários autenticados sem perfil visível caíam em `/login`, e a lógica anterior podia esconder o erro real.
- Migração da convenção de Next.js 16 de `middleware.ts` para `proxy.ts`, mantendo o update de sessão do Supabase.
- Tratamento explícito de perfil ausente em `app/page.tsx` e mensagem diagnóstica temporária em `/login`.
- Identificação do erro Supabase `42P17`: recursão em policies RLS que consultavam `public.profiles` dentro de policies da própria tabela.
- Criação de `supabase/migrations/0005_fix_recursive_rls.sql`, usando helpers `security definer` para buscar organização e papel do usuário sem cair na RLS recursiva.
- Correção da rota `/api/chat`: o AI SDK v6 envia `UIMessage` com `parts`, não `{ content }`; a rota agora converte com `convertToModelMessages()` e responde com `toUIMessageStreamResponse()`.
- Atualização do modelo de chat do OpenRouter de `anthropic/claude-3.5-sonnet` para `anthropic/claude-sonnet-4.5`.

## Decisões

- Manter o fluxo de auth baseado em Supabase Auth + `profiles`, sem salvar senha na tabela pública.
- Não contornar RLS no app; corrigir as policies no banco com funções `security definer`.
- Usar o formato nativo do AI SDK v6 (`UIMessage`/UI stream) em vez de adaptar o cliente para protocolo antigo.
- Atualizar defaults de modelo no código para evitar regressão caso a variável `OPENROUTER_CHAT_MODEL` não esteja definida.

## Pendências

- Reiniciar `npm run dev` após mudança no `.env.local`.
- Testar o fluxo completo: login, criação/listagem de perfis, criação de sessão, primeira mensagem de chat, persistência em `messages` e incremento de `total_tokens`.
- Remover ou suavizar o diagnóstico `reason=` na tela de login depois que RLS estiver estável.
- Validar o fluxo de encerramento de sessão e feedback n8n.
- Investigar por que `tsc --noEmit` e `eslint` ficam presos sem saída no ambiente local.
- Reduzir usos de `any` em actions e route handlers, em conflito com a regra do projeto.

## Problemas novos ou descobertas

- `42P17` no Supabase/Postgres pode indicar recursão de policy RLS, não necessariamente perfil ausente.
- O slug `anthropic/claude-3.5-sonnet` está indisponível no OpenRouter; slugs precisam ser revisados periodicamente.
- A documentação do projeto ainda cita Next.js 15 em alguns lugares, mas o app real usa Next.js 16.2.6.
- O `DefaultChatTransport` do AI SDK v6 espera resposta em UI message stream; `toTextStreamResponse()` causa incompatibilidade com o cliente.

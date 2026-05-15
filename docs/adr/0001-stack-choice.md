# ADR-0001 — Escolha de Stack

**Status:** Aceito  
**Data:** 2026-05-14

## Contexto

Precisamos construir um MVP de simulador de treinamento de vendas com dois papéis distintos (admin e vendedor), chat em tempo real com IA e workflows de avaliação assíncronos. O prazo estimado é de 17–25 dias úteis para uma pessoa.

## Decisão

Adotar a seguinte stack:

| Camada | Escolha |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript strict |
| Estilo | Tailwind CSS + shadcn/ui |
| Banco + Auth | Supabase (Postgres + Auth + RLS) |
| LLM Gateway | OpenRouter via Vercel AI SDK |
| Workflows assíncronos | n8n |
| Deploy | Vercel |

## Alternativas Consideradas

**SvelteKit ao invés de Next.js:** Bom ergonomicamente, mas ecossistema menor e menos suporte nativo para streaming com AI SDKs. Next.js tem integração direta com Vercel AI SDK e Server Actions que simplificam o fluxo de chat.

**Prisma + PlanetScale ao invés de Supabase:** Mais controle sobre o schema, mas Supabase entrega Auth, RLS e Realtime em um pacote — reduz drasticamente a quantidade de infraestrutura para gerenciar no MVP.

**Clerk ao invés de Supabase Auth:** Boa DX para auth, mas adiciona um serviço externo separado. Com Supabase Auth, o token do usuário é o mesmo para acessar o banco via RLS — integração mais limpa.

**Firebase ao invés de Supabase:** Sem SQL nativo dificulta queries analíticas e joins complexos que precisaremos nas Fases 4–5.

## Consequências

- **Positivo:** Stack integrada — Supabase Auth + RLS + DB eliminam código de autorização repetitivo. Vercel + Next.js simplificam deploy e streaming.
- **Positivo:** Vercel AI SDK abstrai o provider de LLM, facilitando trocar ou comparar modelos.
- **Negativo:** Vendor lock-in em Supabase e Vercel. Mitigável com Postgres padrão e possibilidade de auto-hospedagem do Supabase.
- **Negativo:** Next.js App Router ainda tem quirks (comportamento de cache, Server Actions em desenvolvimento). Requer atenção a `revalidatePath` e tratamento de erros em actions.

## Supersede

Nenhum.

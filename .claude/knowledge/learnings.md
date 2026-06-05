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

---

## 2026-05-20 — pnpm e build

**Categoria:** Ops | Bug

O build não falhava por código. Falhava porque `sales-trainer/node_modules` estava inconsistente: symlinks de pacotes como `next`, `eslint` e `typescript` apontavam para `../../node_modules/.pnpm/...`, mas o store virtual real estava em `sales-trainer/node_modules/.pnpm`.

Decisão: limpar `node_modules` e reinstalar com `pnpm install --frozen-lockfile`. No sandbox isso falha porque o pnpm precisa escrever no SQLite do store global; rodar fora do sandbox.

Também foi removido `pnpm.onlyBuiltDependencies` do `sales-trainer/package.json`, pois pnpm atual ignora essa chave. A configuração válida fica em `pnpm-workspace.yaml`.

Foi adicionado `packageManager` na raiz para fixar `pnpm@11.1.2`. Em `next.config.ts`, `turbopack.root = __dirname` evita warning de workspace root quando scripts rodam pela raiz.

Pendente: `pnpm run lint` passa com 1 warning em `components/profile-builder/builder-form.tsx:43`: `watch()` do React Hook Form faz React Compiler pular memoização. Build passa.

---

## 2026-05-20 — Pull das novas entidades + revisão crítica + melhorias do simulador

**Categoria:** Arquitetura | IA | UI | Banco

### Contexto do pull
O pull trouxe migrations 0007 e 0008 (tabelas `scenario_companies` e `scenario_customers`) que não haviam sido aplicadas ao banco. O CLI do Supabase não estava autenticado no ambiente local, então as migrations foram aplicadas manualmente via Supabase Dashboard SQL Editor. O `types/database.ts` já estava atualizado no commit — não precisou ser regenerado.

Os scripts `db:migrate` e `db:types` foram removidos do `sales-trainer/package.json` neste pull (provavelmente intencionalmente, para centralizar na raiz). Documentar: para aplicar migrations, usar o Supabase Dashboard SQL Editor ou autenticar o CLI com `npx supabase login` antes de `npx supabase db push --linked`.

### Decisões da revisão crítica de design
Revisão completa identificou 11 problemas. Os mais críticos implementados nesta sessão:

1. **Evaluator migrado para `generateObject()`**: o código anterior usava `generateText()` + regex `/\{[\s\S]*\}/` para extrair JSON da resposta do modelo — padrão frágil que falha silenciosamente se o modelo incluir explicação fora do JSON. `generateObject()` do Vercel AI SDK garante saída estruturada sem regex.

2. **Competency scores no evaluator**: o framework pedagógico da Negociarte define 5 competências formais (Comunicação, Escuta ativa, Orientação a resultados, Gestão de objeções, Relacionamento). O evaluator anterior retornava `techniques_used`/`techniques_missed` como strings livres — sem mapeamento para essas competências. Agora o schema do evaluator inclui `competency_scores` com score 1–5 e evidência por competência. A migration 0009 adiciona a coluna `competency_scores jsonb` em `session_feedback`.

3. **Auto-populate no builder**: ao selecionar empresa/cliente no profile builder, os campos do formulário ficavam vazios mesmo quando a entidade já tinha dados. O `profiles.ts` já tinha fallback (`field ?? entity.field ?? null`), mas isso era invisível no formulário. Solução: `useEffect` com `useRef` para rastrear se a seleção mudou (não apenas na carga inicial), e `setValue()` para popular os campos. Só popula quando o usuário muda a seleção — não sobrescreve valores no modo edição.

4. **Behavior style fixo por perfil**: o estilo de comportamento era sempre aleatório. Agora `customer_profiles` tem `behavior_style_id` opcional (migration 0009). Se preenchido, `createSession` usa esse estilo; se não, mantém seleção aleatória.

5. **Tela de briefing pré-sessão**: `createSession` agora redireciona para `/train/[sessionId]/briefing` em vez de direto para o chat. O seller vê o contexto da visita, objetivo e critério de sucesso antes de iniciar a conversa.

6. **FeedbackPoller**: sessão encerrada sem feedback mostrava nada. Agora um componente client faz polling a cada 5s na tabela `session_feedback`. Quando o n8n grava o feedback, o componente atualiza automaticamente. Abordagem polling (não Realtime) para evitar dependência de RLS policies na subscription — pode ser migrado para Supabase Realtime futuramente.

### O que ficou pendente (não implementado nesta sessão)
- **Migration 0009 precisa ser aplicada manualmente** pelo usuário no Supabase Dashboard. Arquivo: `supabase/migrations/0009_competency_scores_and_profile_style.sql`.
- **Indicador de prompt desatualizado**: perfis compilam o `system_prompt` na criação. Se a empresa/cliente for atualizada depois, os perfis existentes ficam com dados obsoletos. Pendente: mostrar "última compilação em X dias" com botão "Recompilar" no StepPromptPreview.
- **Radar chart visual**: FeedbackCard usa barras de progresso. Um spider chart de 5 eixos seria mais legível para o formato de competências — requer adicionar biblioteca de gráficos.
- **Progressão de estilos por histórico do seller**: estilo aleatório ou fixo, mas sem lógica de progressão pedagógica (iniciantes deveriam enfrentar estilos mais fáceis primeiro).

### Padrões novos identificados
- `useRef` para detectar mudança vs. carga inicial em `useEffect` com `watch` do react-hook-form — evita sobrescrever dados no modo edição.
- O padrão de `StepProps` com tipos estendidos (empresa completa, cliente completo, behavior_styles) permite que os steps acessem dados ricos sem precisar de fetches adicionais no cliente.

---

## 2026-05-21 — Avaliador redesenhado + remoção do n8n + fetch em Server Action

**Categoria:** IA | Arquitetura | Bug

### O que foi feito

1. **Avaliador novo** — substituiu 5 competências genéricas pelo framework real da Negociarte: 6 etapas, 11 comportamentos, 200 pts. Schema Zod em `lib/ai/evaluator.ts`, prompt em `lib/ai/prompts/evaluator-template.ts`, display em `components/chat/feedback-card.tsx`. `overall_score` agora é 0–200 (era 1–10).

2. **Removeu n8n** — avaliação agora é direta. Fluxo: `endSession` → POST `/api/evaluate-session` → `after()` roda `runEvaluation()` → grava `session_feedback`. Rota `app/api/webhooks/n8n/route.ts` deletada.

3. **Bug crítico descoberto**: `fetch()` não-aguardado dentro de Server Action é **cancelado silenciosamente** pelo Next.js quando a Action retorna. Nenhum log, nenhum erro — simplesmente não executa. Mesmo `after()` é instável em Server Actions.

### Decisões

- **`after()` vai em Route Handler, não em Server Action.** Route Handler tem contexto HTTP próprio; `after()` funciona de forma confiável ali.
- **`endSession` awaita o fetch** para `/api/evaluate-session`, mas a rota retorna `202` imediatamente. O `after()` da rota roda a avaliação em background. Cliente não espera 30s.
- **`export const maxDuration = 60`** na route handler garante timeout suficiente para o LLM.

### Pendente

- ~~Verificar se `after()` na Route Handler funciona em produção (Vercel)~~ — confirmado funcionando. ✓
- ~~Migrations 0009 e 0010~~ — aplicadas. ✓
- Indicador de prompt desatualizado no `StepPromptPreview`.
- Radar chart no FeedbackCard (atualmente barras de progresso).

---

## 2026-05-25 — Avaliador funcionando + simplificação do profile builder

**Categoria:** Bug | UI | Banco

### Avaliador: 3 bugs corrigidos em cadeia

1. **`fetch` sem cookies → redirect para login**: `endSession` chamava `fetch('/api/evaluate-session')` sem repassar os cookies da sessão. O middleware interceptava, não encontrava usuário autenticado e redirecionava para `/login?redirect=/api/evaluate-session`. A avaliação nunca chegava a rodar. Fix: repassar o header `Cookie` da request original no fetch interno (`h.get('cookie')`).

2. **`BehaviorScore.min(1)` rejeitava score 0 do LLM**: quando o vendedor não demonstrava algum comportamento, o modelo retornava `0`, mas o schema Zod tinha `.min(1)`. `generateObject` falhava após 3 tentativas e o erro era capturado silenciosamente pelo `after()`. Fix: alterar para `.min(0)`.

3. **Constraint do banco desatualizada**: `session_feedback.overall_score` tinha `check (overall_score between 1 and 10)` — schema do n8n legado. O novo avaliador gera 0–200. Fix: migration `0011_overall_score_range.sql`.

Padrão crítico aprendido: **erros dentro de `after()` são silenciosos** — só aparecem nos logs do servidor. Diagnóstico é sempre pelos logs (Vercel Functions), não pela UI.

### Admin sessions: FeedbackPoller adicionado

`/admin/sessions/[id]` era server-rendered sem polling. Se o feedback não existia no momento do load, mostrava "Avaliação em processamento..." e nunca atualizava. Agora usa o mesmo `FeedbackPoller` do seller.

### Profile builder: quick-create inline

Empresa e cliente agora podem ser criados diretamente do formulário de perfil via Dialog (`QuickCreateDialog`). Antes era necessário sair para `/admin/companies/new` e `/admin/customers/new`. Hierarquia das tabelas preservada.

Campos avançados em ambos os steps movidos para `<details>` accordion — reduz o ruído visual sem remover funcionalidade.

Novo componente: `components/profiles/QuickCreateDialog.tsx` — genérico, recebe `fields`, `action` e `onSuccess`.

Novos schemas: `QuickCompanySchema`, `QuickCustomerSchema` em `lib/schemas/scenario-entities.ts`.

Novas actions: `createCompanyQuick`, `createCustomerQuick` em `lib/actions/scenario-entities.ts` — retornam `{ id, name }` sem redirect.

---

## 2026-05-24 — Gerador automático de personas

**Categoria:** IA | UI | Arquitetura

### O que foi feito

Implementado um gerador de personas end-to-end acionado por um botão "Gerar persona" no `ProfileFormLayout`. O admin descreve o cenário em linguagem livre + escolhe tipo de cenário e dificuldade, e a IA gera todos os ~25 campos do perfil de uma vez.

### Decisões e por quê

1. **`generateObject()` em vez de `generateText()` + parsing**: o mesmo motivo do evaluator — saída estruturada garantida pelo SDK, sem regex frágil.

2. **Empresa e cliente criados no banco automaticamente**: usamos `createCompanyQuick` + `createCustomerQuick` em paralelo (`Promise.all`). Os campos ricos gerados pela IA (market_situation, pain_points, etc.) ficam apenas no formulário/perfil, não nos registros de empresa/cliente — aceitável porque o perfil é a fonte de verdade para a simulação.

3. **`localCompanies` / `localCustomers` em estado local no ProfileFormLayout**: as listas vinham como props imutáveis do servidor. Para adicionar empresa/cliente recém-criados ao dropdown sem fazer `router.refresh()` (que resetaria o formulário), convertemos as props em `useState` e fazemos append via callback `onSuccess`. Padrão reusável para qualquer fluxo que cria entidades inline.

4. **Modelo `suggestion` (gpt-4o-mini) para geração**: custo baixo, suficiente para preencher campos descritivos. Se a qualidade dos campos precisar melhorar, basta alterar `OPENROUTER_SUGGEST_MODEL`.

5. **Dialog reseta estado ao fechar**: `useEffect` com `[open]` — mesmo padrão do `QuickCreateDialog`.

### Arquivos criados/modificados

- **Novo:** `app/api/ai/generate-persona/route.ts` — route handler POST com `generateObject()` e schema Zod completo
- **Novo:** `components/profiles/GeneratePersonaDialog.tsx` — dialog com 3 inputs, estados `idle → generating → creating → done/error`, exporta tipo `GenerateResult`
- **Modificado:** `components/profiles/ProfileFormLayout.tsx` — `localCompanies`/`localCustomers` em estado, botão "Gerar persona", `handleGenerateSuccess` que popula ~25 campos via `form.setValue`

### Pendente

- ~~Typecheck: confirmado limpo (`tsc --noEmit` sem erros).~~ ✓
- Testar o fluxo completo em desenvolvimento (criar persona → revisar campos → salvar → verificar system_prompt compilado).

---

## 2026-05-28 — Expansão massiva do produto (migrations 0012–0018) + pendências abertas

**Categoria:** Arquitetura | Banco | IA | Auth | UI | Bug

### O que foi feito (commit 54115cc, 2026-05-27)

A sessão anterior entregou o maior commit do projeto até agora: 7.248 linhas adicionadas em 70 arquivos. Features principais:

- **Knowledge base por empresa** — tabela `company_knowledge_docs`, upload de PDF/URL + compressão IA via `/api/knowledge/*`. Novas dependências: `pdf-parse`, `mammoth`.
- **Vínculo seller ↔ empresa** — tabela `seller_companies`. Admin pode associar sellers a empresas-cenário. Sellers só veem perfis das empresas às quais estão vinculados.
- **Histórico seller ↔ cliente** — tabela `seller_customer_history`. Sessões anteriores ficam acessíveis ao seller antes do briefing.
- **Critérios de avaliação configuráveis** — tabela `evaluation_criteria` com `stages JSONB`. O evaluator agora busca os critérios da org antes de chamar o LLM. Se nenhum critério existir, usa fallback padrão (confirmar se o fallback está implementado em `evaluator.ts`).
- **Objetivo da visita por sessão** — coluna `chosen_objective` em `training_sessions`, `available_objectives` em `customer_profiles`. Seller escolhe o objetivo no `PreSessionForm` antes do chat.
- **Join por link de convite** — coluna `join_code` em `scenario_companies`. Rota `/join/[code]` + `/api/auth/signup-seller` cria seller já vinculado à empresa, sem precisar de convite manual pelo admin.
- **Admin refatorado** — `/admin/companies/[id]` agora tem 7 abas: Perfis, Sessões, Vendedores, Histórico, Critérios, Conhecimento, Acesso (join code).

### Novo fluxo do seller

```
/join/[code]            → signup automático vinculado à empresa
/train/welcome          → boas-vindas para seller recém-cadastrado
/train                  → lista de perfis; detecta sessão ativa e mostra banner "Continuar sessão"
/train/[sessionId]/briefing → PreSessionForm: escolhe objetivo; vê contexto do cliente
/train/[sessionId]      → chat
PostSessionActions      → após encerrar: ações de próxima sessão / ver feedback
```

### Bug crítico encontrado: número de migration duplicado

`0018_admin_delete_companies.sql` e `0018_project_join_code.sql` — **dois arquivos com prefixo 0018**. O Supabase CLI ordena migrations por nome de arquivo; ambos rodam (em ordem alfabética), mas o versionamento está incorreto. O arquivo de delete de empresas deveria ser `0017_*` (ou renumerado). Risco: se o CLI comparar por número de versão, pode pular ou conflitar uma das migrations.

### Pendência crítica aberta: `scenario-entities.ts` modificado sem commit

O arquivo `lib/actions/scenario-entities.ts` tem 3 mudanças não commitadas:
1. `import { randomUUID } from 'crypto'`
2. `join_code: randomUUID().replace(/-/g, '')` em `createScenarioCompany`
3. `join_code: randomUUID().replace(/-/g, '')` em `createCompanyQuick`

Essas mudanças são **necessárias** — a migration 0018_project_join_code torna `join_code NOT NULL`. Sem elas, qualquer insert de nova empresa via Server Action falharia com constraint violation. Precisa ser commitado.

### Padrões novos identificados

- **`localCompanies`/`localCustomers` em estado local**: listas de entidades chegam como props do servidor, mas são convertidas em `useState` para permitir append de entidades criadas inline (QuickCreate / GeneratePersona) sem `router.refresh()` que resetaria o formulário.
- **Múltiplos Route Handlers de IA**: o projeto passou de 1 rota (`/api/chat`) para um conjunto de rotas especializadas: `/api/ai/generate-persona`, `/api/ai/parse-criteria`, `/api/ai/parse-behavior-style`, `/api/ai/analyze-knowledge`, `/api/evaluate-session`. Cada uma com `maxDuration` configurado.
- **Funções SECURITY DEFINER para lookup público**: `get_project_by_join_code()` e `get_or_create_seller_company_link()` são públicas (sem RLS) mas usam `SECURITY DEFINER` para acessar dados cross-org de forma controlada. Padrão a ser seguido para qualquer endpoint que precise funcionar antes do usuário estar autenticado.

### Pendências de sessões anteriores ainda abertas

- Indicador de "prompt desatualizado" no `StepPromptPreview` (perfil compilado com dados antigos da empresa/cliente).
- Radar chart no FeedbackCard (ainda usa barras de progresso).
- Verificar se evaluator tem fallback quando nenhum critério está cadastrado para a org.

---

## 2026-05-28 — UX knowledge management: criação de projeto + confirmação de delete

**Categoria:** UI | Arquitetura

### Feito
- `NewCompanyFlow` (client): fluxo 2 fases — fase 1 cria empresa com `createCompanyQuick`, fase 2 mostra `KnowledgeDocList` na mesma página. Resolve: admin descobria knowledge só depois de criar.
- `KnowledgeDocList`: substituiu `window.confirm()` por estado inline `pendingDeleteId` com "Remover? Sim / Não". Padrão igual ao `JoinCodeSection`.
- `createScenarioCompany`: `.select('id').single()` para capturar ID após insert (caso de uso futuro). Redirect atualizado para `/admin/companies/[id]?tab=knowledge&setup=1` mas não é mais o caminho principal de criação.

### Decisões
- `createCompanyQuick` usado na criação (retorna `{id, name}` sem redirect) — não `createScenarioCompany`. Motivo: cliente precisava do ID sem sair da página.
- Sem `AlertDialog` do shadcn (não instalado). Estado inline é consistente com padrões já usados no projeto.

### Pendente
- `scenario-entities.ts` ainda tem 3 linhas não commitadas (join_code nos inserts) — commitar antes do próximo deploy.
- `createScenarioCompany` ficou sem chamadores na UI — pode virar dead code se ninguém mais usar formulário completo de criação.
- Banner de setup (`?setup=1` no `/admin/companies/[id]`) foi planejado mas não implementado — baixa prioridade.
- Score "X/10" incorreto na `SessionsTable` (deveria ser 0–200) — não tocado.

---

## 2026-05-29 — Redesign UX admin: 5 abas + fluxo CRM para cenários

**Categoria:** UI | Arquitetura | IA

### Feito

- **5 abas** em `/admin/companies/[id]`: `context | scenarios | styles | criteria | access` (era 4: `knowledge | customers | styles | criteria`). Slugs antigos não existem mais.
- **Aba Contexto** (`context`): form da empresa PRIMEIRO, depois docs de knowledge. Fluxo linear explícito: "o que vende → sobe docs → IA enriquece".
- **Aba Cenários** (`scenarios`): `ScenariosSection.tsx` com cards por cenário. Botão "+ Novo cenário" abre `CreateScenarioDialog` inline — sem sair da página.
- **Aba Acesso** (`access`): join code + seller linker extraídos da aba context. `AccessSection.tsx`.
- **`CreateScenarioDialog.tsx`**: dialog CRM-like 2 etapas. Etapa 1: nome, cargo, empresa do prospect (diferente do projeto!), descrição do negócio, histórico de relacionamento. Etapa 2: tipo + dificuldade. Chama `/api/ai/generate-scenario-from-contact`.
- **`/api/ai/generate-scenario-from-contact`**: nova route. Recebe dados do contato B2B + contexto do projeto (product_context, marketing_strategy do projeto = empresa do vendedor). Gera `scenario_customer` + campos completos do `customer_profile`.
- **`createProfileQuick`** em `scenario-entities.ts`: nova action que compila `system_prompt` no servidor e insere `customer_profile`. Usada por dialog e por AnalyzeKnowledgeDialog.
- **`AnalyzeKnowledgeDialog`**: agora cria `customer_profiles` completos (não só `scenario_customers`). Redireciona para `?tab=scenarios` após aplicar.
- **`AnalysisSchema`** expandido com todos os campos de profile (visible_briefing, visit_objective, success_criteria, confidential_context, etc.).
- **Prompt `analyze-knowledge`** reescrito: documenta que docs são da empresa VENDEDORA, personas são COMPRADORES.
- **Bug corrigido**: `ScenariosSection` tinha link `/admin/profiles/[id]/edit` (404). Correto: `/admin/profiles/[id]`.

### Decisão-chave

`scenario_companies` = empresa do VENDEDOR (o projeto). Empresa do PROSPECT (o comprador B2B) não vira entidade separada — fica no description do `scenario_customer` e nos campos do `customer_profile` gerados pela IA. `company_id` no profile aponta para o projeto (herda product_context do vendedor).

### Pendente

- `ScenariosSection` não mostra `scenario_type` e `difficulty_level` no card se o perfil foi criado sem esses campos (exibe só o nome). Sem impacto funcional.
- `CustomerHistorySection` ainda existe mas não é mais usado — pode virar dead code.
- Indicador de prompt desatualizado no `StepPromptPreview` — ainda aberto.
- Radar chart no FeedbackCard — ainda aberto.
- Score "X/10" na `SessionsTable` (deveria ser 0–200) — ainda aberto.

---

## 2026-05-29 — Simplificação cenário + KB autocomplete + filtros analytics

**Categoria:** UI | IA | Bug

### Feito

- **`CreateScenarioDialog`**: 2 etapas → form único. "Perfil do negócio" obrigatório (min 10) → "Contexto adicional" opcional. Validação: só nome, cargo, empresa.
- **`generate-scenario-from-contact` route**: busca `company_knowledge_docs` ativos (max 30k chars) e injeta no prompt como "BASE DE CONHECIMENTO". `prospect_company_description` virou opcional — KB assume o papel principal.
- **`StepScenario`**: removido amber box redundante. "Modelo de IA" movido para `<details>` (avançado). Placeholders dos textareas removidos (já explicados pelo `description` do field).
- **Sidebar**: removido link "Todos os cenários". Cenários só acessíveis dentro de cada projeto.
- **`CriteriaManagerSection`**: `key` warning corrigido. `<>` sem key → `<Fragment key={...}>` no elemento pai do map. Key saiu do `<tr>` interno para o Fragment.
- **Analytics**: filtro por projeto igual ao de sessões — `searchParams`, `<form>` GET, `.in('customer_profile_id', profileIds)` para filtrar contagens e feedback.

### Decisões

- KB injetada automaticamente na geração (sem botão manual) — mais simples, usuário não precisa pensar.
- `noResults` guard antes de queries com `.in()` vazio: Supabase retorna erro com array vazio, curto-circuitar com `Promise.resolve({ count: 0 })` evita o problema.

### Pendente (acumulado)

- Indicador de prompt desatualizado no `StepPromptPreview`
- Radar chart no FeedbackCard (ainda barras)
- Fallback no evaluator quando org sem critérios cadastrados

---

## 2026-05-29 — Clientes com PDFs + prompt editável + resoluções

**Categoria:** Arquitetura | Banco | UI

### Feito

- **Migrations 0019 e 0020 aplicadas** — `scenario_customers` ganhou `company_id` + 3 slots de PDF; `evaluation_criteria` ganhou `sales_process_text/file_path` + `competencies_text/file_path`.
- **Score SessionsTable corrigido** — exibe 0–200 (era "X/10" do schema legado do n8n).
- **Aba Clientes** — `scenario_customers` virou entidade do projeto com 3 PDFs (perfil, dores/objeções, histórico). Upload via `/api/knowledge/upload-entity-doc`. Componentes: `ClientDocSlot`, `ClientsSection`, `CreateClientDialog`.
- **Cenários via seletor** — `CreateScenarioDialog` reescrito: dropdown de cliente + dropdown de estilo (sem campos de texto livres). Rota `generate-scenario-from-contact` usa PDFs do cliente como contexto.
- **Prompt editável** — `StepPromptPreview` virou `<textarea>`. Edição propaga para o formulário via `onPromptChange` → `form.setValue('system_prompt', ...)`. Server actions usam o prompt customizado se não-vazio; do contrário, recompilam.

### Pendente

- `scenario-entities.ts` — 3 linhas não commitadas (`join_code: randomUUID()` nos inserts de empresa). Necessário para constraint `NOT NULL`.
- Indicador de prompt desatualizado no `StepPromptPreview`.
- Fallback no evaluator quando org sem critérios cadastrados.
- Radar chart no FeedbackCard (ainda barras).

---

## 2026-05-31 — Auditoria de dependências + fix PDF + migrations limpas

**Categoria:** Ops | Bug | Banco

### O que foi feito

1. **Auditoria completa do package.json** — diagnóstico com nível de severidade de cada problema.
2. **Limpeza do package.json**:
   - `pdfjs-dist ^5.4.296` declarado como dep direta (antes só existia como transitivo de `pdf-parse`)
   - `pdf-parse` removido (era "muleta" para instalar pdfjs-dist; código não o usava mais)
   - `@types/pdf-parse` removido (tipo de pacote inexistente)
   - `tw-animate-css` removido (não referenciado em nenhum arquivo)
   - `shadcn` movido para devDependencies (é CLI, não runtime)
   - Dev script trocado de `next dev --webpack` para `next dev` (Turbopack nativo, consistente com `turbopack.root` já no `next.config.ts`)
3. **Fix do 422 em `/api/knowledge/upload`** — root cause: `pdfjs-dist v5` quebrou a API de worker (ver raw `2026-05-31-pdfjs-dist-v5-node.md`).
4. **Migration duplicada resolvida**: `0018_project_join_code.sql` → `0023_project_join_code.sql` (conteúdo idempotente) + `0024_fix_migration_registry.sql` (deleta entrada antiga de `supabase_migrations.schema_migrations` em prod).

### Decisões-chave

- **`path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')`**: usa `process.cwd()` como base, que no Next.js aponta para a raiz do projeto tanto em dev quanto no Docker standalone. Solução simples sem depender de `import.meta.url` (indisponível em CJS compilado pelo Next.js) ou hardcode de path absoluto.
- **Conteúdo idempotente na migration 0023**: `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, constraint verificada via `pg_constraint` em bloco `DO $$`. Necessário porque a migration roda novamente em prod (a entrada no registry muda de `0018_project_join_code` para `0023_project_join_code`).
- **`0024` deleta a entrada antiga do registry**: se apenas renomeássemos o arquivo, o Supabase tentaria reaplicar a migration `0023` (não está no registry) e **também** nunca removeria o registro `0018_project_join_code` (o arquivo não existe mais, mas o registro sim).

### Pendente (crítico)

- **`pnpm db:migrate` em produção**: aplica `0023_project_join_code` (idempotente) e `0024_fix_migration_registry` (limpa o registry). Deve ser feito antes do próximo deploy.

### Pendente (acumulado de sessões anteriores)

- Indicador de prompt desatualizado no `StepPromptPreview`
- Fallback no evaluator quando org sem critérios cadastrados
- Radar chart no FeedbackCard (ainda barras de progresso)
- Score "X/200" correto na `SessionsTable` (confirmado corrigido em 2026-05-29, mas verificar se persiste)

### Padrões novos identificados

- **`catch {}` silencioso em routes de upload**: o upload route engolia todo erro de `extractPdfText()` com `catch {}`, tornando diagnóstico impossível pela UI. Padrão a evitar — sempre `console.error(e)` antes de retornar erro genérico.
- **Root lock file vs workspace**: a raiz do monorepo tem `pnpm-lock.yaml` de 9 linhas (quase vazio) porque `package.json` raiz não declara `workspaces`. O lock real está em `sales-trainer/pnpm-lock.yaml`. Não é bug, mas confunde quem tenta instalar pela raiz.

---

## 2026-05-31 — Auditoria OpenRouter + fixes de bugs + indicador de prompt desatualizado

**Categoria:** IA | Bug | UI

### Feito

1. **Auditoria completa OpenRouter**: 7 rotas mapeadas. Sistema prompt = compilado (estático, salvo no perfil) + 5 injeções runtime por request (KB empresa, histórico seller-cliente, estilo comportamental, dificuldade, objetivo). KB não tem "memória" — histórico completo de mensagens enviado a cada turn, sem sumarização.

2. **Migration 0024 corrigida**: `supabase_migrations.schema_migrations` não existe em ambientes que aplicam migrations pelo Dashboard (sem CLI). Reescrita como `DO $$ IF EXISTS ... END $$` — no-op seguro se schema não existe. Pode rodar no Dashboard.

3. **`scenario-entities.ts` já estava commitado** em `8ec47ef` — pendência dos learnings anteriores era falso alarme.

4. **Bug: prompt avaliador dizia "score 1 a 5"** — schema Zod já aceitava 0 desde maio, texto do prompt ainda pedia mínimo 1. Corrigido para "0 a 5" em `evaluator-template.ts`.

5. **Bug: `evaluate-session/route.ts` hardcodava modelo** — duplicava lógica de `modelFor('evaluation')`. Corrigido.

6. **Bug crítico: sem limite no KB do chat** — `company_knowledge_docs` concatenados sem limite. Empresa com muitos PDFs ultrapassaria context window silenciosamente. Adicionado `MAX_KNOWLEDGE_CHARS = 20_000` em `app/api/chat/route.ts`.

7. **Indicador de prompt desatualizado completo**: botão "Recarregar campos" no aviso amber. Clique: `handleReloadFromSource()` reescreve todos os campos empresa/cliente no form → `reloadPending=true` → effect sincroniza `editedPrompt` com novo `generatedPrompt` → `onPromptChange('')` limpa `system_prompt` → servidor recompila ao salvar.

### Decisões

- **`handleReloadFromSource` sobrescreve SEMPRE** (inclusive com `''` quando campo é null) — objetivo é apagar dados stale, não apenas preencher vazios. Diferente do `StepCompany.useEffect` que só preenche não-vazios.
- **`reloadPending` + React 18 batching**: `form.setValue` e `setReloadPending(true)` na mesma função são batched. `generatedPrompt` já está atualizado quando o effect do `reloadPending` roda. Sem setTimeout ou ref extra.
- **`onPromptChange('')`**: garante que o server action entre no branch `compileSystemPrompt(merged)`, não use snapshot antigo.

### Pendente

- `generate-persona/route.ts` usa query manual de role em vez de `requireAdmin()` — inconsistente, baixo risco funcional.
- Radar chart no FeedbackCard (ainda barras).
- ~~`pnpm db:migrate` em produção (0023 + 0024)~~ — aplicado. ✓

### Padrão novo

- **`reloadPending` para sincronizar estado derivado**: quando estado A depende de estado B externo (prop), e B precisa atualizar antes de A ser recalculado, usar flag `pending` + effect que aguarda B. Funciona porque React 18 batea as duas atualizações no mesmo render.

---

## 2026-05-31 (2) — Modelos IA, upload múltiplo, redirect pós-save

**Categoria:** IA | UI | Bug

### Feito

1. **Modelos evaluation + suggestion → `google/gemini-3.1-flash-lite`** em `lib/ai/models.ts`. Substituível via env var.
2. **Upload múltiplo de PDF** no `KnowledgeDocList`: `input[multiple]`, loop sequencial, progresso `N/total`, erros por arquivo acumulados.
3. **Redirect pós-save de cenário**: `updateProfile` agora faz `redirect(/admin/companies/[company_id]?tab=scenarios)` se perfil tem empresa, senão `/admin/profiles`. Breadcrumb e botão Cancelar da página de edição seguem o mesmo destino via prop `cancelHref`.

### Decisões

- Upload sequencial (não paralelo): evita sobrecarga e mostra progresso claro.
- `cancelHref` com default `'/admin/profiles'` — página de criação não passa a prop, comportamento inalterado.

### Pendente

- `generate-persona/route.ts` — auth manual em vez de `requireAdmin()`.
- Radar chart no FeedbackCard.
- Testar botão "Recarregar campos" no modo edição.

---

## 2026-05-31 — Reestruturação de abas: projetos 6→3, cenário 4→5

**Categoria:** UI | Arquitetura

### Feito

- **Projeto** (`/admin/companies/[id]`): abas Clientes, Estilos, Critérios removidas. Ficou: Contexto | Cenários | Acesso.
- **Editor de cenário** (`/admin/profiles/[id]`): steps Empresa e Cliente removidos. Novas abas: Clientes | Estilos | Critérios | Briefing | Preview.
- **`StepBriefing.tsx`** (novo): funde StepCompany + StepScenario. Campos de empresa ficam em `<details>` colapsável (overrides). Campos de cliente (dores, objeções) ficam na seção "Base interna".
- **`ClientsSection`**: ganhou props `selectedCustomerId` e `onSelectCustomer`. Botão "Usar neste cenário" por card; cliente ativo mostra badge "Selecionado" + borda preta.
- **`ProfileFormLayout`**: tabs novas; footer Cancelar/Limpar/Salvar só em Briefing e Preview; ao selecionar cliente auto-preenche campos do form; removeu `localCompanies`.
- **`StepCompany.tsx` e `StepClient.tsx`**: deletados.
- **`profiles/new/page.tsx`**: removida prop `companies` (não existe mais); `behaviorStyles` select expandido.

### Decisões

- Clientes no editor = gestão completa (ClientsSection), não só seletor — usuário pediu explicitamente.
- Campos de empresa viram override colapsável no Briefing — não foram deletados pois a simulação pode precisar sobrescrever contexto por cenário.
- `behaviorStyles` no editor agora busca `simulation_guidance, evaluation_criteria, is_active` — necessário para `BehaviorStylesSection` funcionar.
- `customers` no editor agora filtrado por `company_id` — evita mostrar clientes de outros projetos.
- Footer oculto nas abas de gestão (Clientes/Estilos/Critérios) — essas abas usam server actions próprias, não o form principal.

### Pendente (acumulado)

- `generate-persona/route.ts` — auth manual em vez de `requireAdmin()`.
- Radar chart no FeedbackCard.
- `ClientsSection` no editor usa `initialClients` gerado a partir de `localCustomers` (sem doc slots). Se usuário fizer upload de PDF num cliente via esse editor, o slot aparece mas o estado local não reflete — baixo impacto pois docs já estão no banco.

### Padrão novo

- **Abas mistas (form + gestão) no mesmo layout**: tabs de form usam `react-hook-form`; tabs de gestão usam server actions diretas. Discriminado pela constante `FORM_TABS`. Footer e submit só aparecem quando `FORM_TABS.includes(activeTab)`.

---

## 2026-05-31 — Revisão da jornada de criação de cenário

**Categoria:** UI | IA | Banco

### Feito

1. **Migration 0025**: `evaluation_criteria` ganhou 4 novas colunas — `style_alignment_text/file_path`, `result_adherence_text/file_path`, e `custom_criteria jsonb DEFAULT '[]'`. As 4 dimensões fixas de critério agora têm slots de documento.

2. **Análise IA de documentos de cliente** — Nova rota `/api/ai/analyze-client-doc`. Quando um PDF é enviado para um slot de cliente (business_profile, pain_objections, relationship_history), o `ClientDocSlot` dispara automaticamente a análise IA pós-upload. O texto bruto do PDF é substituído por um resumo estruturado em markdown gerado pelo modelo `suggestion`. UI mostra "Processando com IA..." com ícone `Sparkles`.

3. **Seleção de estilo na aba Estilos** — `BehaviorStylesSection` ganhou `selectedStyleId` e `onSelectStyle` props, idêntico ao padrão do `ClientsSection` ("Usar neste cenário" + badge "Selecionado" + borda preta). O dropdown redundante de `behavior_style_id` foi removido do `StepBriefing`.

4. **CriteriaManagerSection redesenhado** — 4 slots fixos de documento + seção modular de "Critérios adicionais" (JSONB). Admin pode criar/deletar critérios customizados via `updateCustomCriteria` server action. Cada slot usa `analyzeWithAI={false}` (critérios não passam pelo pipeline de análise de cliente).

5. **Editor inline de etapas/comportamentos** — `StagesEditor` sub-componente dentro de `CriteriaManagerSection`. Botão "Editar etapas" ativa modo edição: inputs diretamente na tabela para label de etapa/comportamento e peso; botões + (add) e lixeira (delete) por etapa e por comportamento. Total de pontos recalculado em tempo real por `calcTotal(stages)`. Chaves geradas por `randKey(prefix)` — 6 chars alpha aleatórios para garantir conformidade com regex `/^[a-z_]+$/` do `BehaviorSchema`.

6. **`upload-entity-doc`** atualizado para aceitar `style_alignment` e `result_adherence` como fields válidos de `criteria`.

7. **"Novo cenário" → navegação direta** — Removido `CreateScenarioDialog` do `ScenariosSection`. Botão "Novo cenário" e link de empty state viram `<Link>` para `/admin/profiles/new?company_id={companyId}`. Página `new/page.tsx` lê `company_id` dos searchParams, filtra clientes por empresa e carrega `activeCriteria` do projeto automaticamente. Breadcrumb e `cancelHref` apontam para `?tab=scenarios` da empresa.

### Decisões

- **Análise automática vs. botão manual**: escolhemos automática (dispara no upload) para minimizar fricção. O usuário não precisa saber que há um passo extra.
- **`analyzeWithAI={false}` nos slots de critério**: a análise de cliente (personas B2B) requer prompts específicos por campo. Para critérios, o texto bruto é suficiente pois é o avaliador que interpreta. Evita criar 4 novos prompts por ora.
- **`custom_criteria` como JSONB em vez de tabela separada**: evita migration de FK e RLS extra. Array de `{id, name, text}` é simples o suficiente para o uso atual (critérios customizados são raros e o admin é a única persona que os gerencia).
- **Chave computada `{ [column]: text }` quebra TypeScript do Supabase**: o tipo gerado pelo Supabase não aceita string index signatures. Usar ternário explícito (`field === 'x' ? { x_text: val } : ...`) é o padrão estabelecido no projeto.

### Pendente

- `generate-persona/route.ts` — auth manual em vez de `requireAdmin()`.
- Radar chart no FeedbackCard (ainda barras).
- Aplicar migration 0025 no banco de produção (Supabase Dashboard).

---

## 2026-05-31 — Bugs UX: critérios, objetivos customizados, criação de cliente, redirect pós-save

**Categoria:** Bug | UI

### Feito

1. **Critérios não salvava (UI stale)** — `CriteriaManagerSection` exibia `activeCriteria.stages` (prop do servidor) após `saveStages()`. Parecia não salvar. Fix: `router.refresh()` após save. Mesmo problema em `saveParsedCriteria()`: novo critério não aparecia depois da IA gerar. Fix igual.

2. **Objetivos customizados** — `StepBriefing` ganhou input+botão para adicionar strings livres a `available_objectives`. Tags removíveis. Schemas atualizados em cadeia: `CustomerProfileSchema.available_objectives` passou de `z.array(z.enum(SESSION_OBJECTIVES))` para `z.array(z.string())`; `CreateSessionSchema` e `UpdateObjectiveSchema.chosen_objective` passaram de `z.enum(SESSION_OBJECTIVES)` para `z.string().min(1).max(500)`. `ObjectiveSelector` e `BriefingStartSection` e `PreSessionForm` trocaram tipo `SessionObjective` por `string`.

3. **CreateClientDialog** — removida máquina de estados 2 fases (idle→docs). Agora view única scrollável: formulário no topo, seção "Base interna" abaixo com placeholder até o cliente ser criado, depois docs ativos. Mesmo UX, sem troca de fase.

4. **Redirect pós-save cenário** — `CustomerProfileSchema.customer_id` era UUID obrigatório. Perfis criados via `CreateScenarioDialog` (sem customer) ficavam com `customer_id: ''` → Zod falhava → action nunca rodava → sem redirect. Fix: `customer_id` virou `.optional()`. Removido `if (!customer) throw` em `createProfile` e `updateProfile` (código já usava `customer?.field`). `createProfile` agora redireciona para `/admin/companies/[id]?tab=scenarios` igual ao `updateProfile`.

### Padrões novos

- **`router.refresh()` vs `revalidatePath`**: `revalidatePath('/admin/companies')` não revalida `/admin/companies/[id]`. Para componentes client que exibem props do servidor após mutation, `router.refresh()` é o fix correto.
- **Schemas em cascata**: mudar o tipo de um campo (ex: `SessionObjective → string`) requer rastrear todos os consumers: schema Zod, action, componentes client com `useState<T>`, props de componentes filho.

### Pendente (acumulado)

- `generate-persona/route.ts` — auth manual em vez de `requireAdmin()`.
- Radar chart no FeedbackCard.
- ~~Aplicar migration 0025 no Supabase Dashboard.~~ ✓

---

## 2026-06-05 — Continuidade da knowledge base entre agentes

**Categoria:** Arquitetura | Ops

O projeto usa `.claude/knowledge/` como memória operacional durável. Mesmo quando o agente ativo não é o Claude, essa pasta continua sendo a fonte de contexto acumulado do produto: decisões não-óbvias, bugs com diagnóstico difícil, padrões locais e pendências que afetam tarefas futuras.

### Decisão

- Manter o formato existente em `learnings.md`: entradas cronológicas, com categoria, foco no **por que** e nas consequências.
- Registrar apenas aprendizados reutilizáveis. Não registrar comandos triviais, respostas de suporte simples ou cada pequena alteração de código.
- Criar artigos em `wiki/` quando um tema virar referência estável ou precisar de explicação mais longa; manter `learnings.md` como trilha cronológica.
- Antes de tarefas maiores, consultar `CLAUDE.md`, `sales-trainer/lib/CLAUDE.md`, `sales-trainer/components/CLAUDE.md` e `.claude/knowledge/learnings.md`.

### Padrão operacional

- Ao corrigir bug com causa não óbvia, registrar causa raiz, decisão e pendência residual.
- Ao mudar arquitetura, fluxo de IA, schema/RLS, auth ou pipeline de PDF/knowledge, registrar a justificativa.
- Ao descobrir documentação desatualizada, registrar o fato e preferir o código + migrations + commits como fonte de verdade.

---

## 2026-06-05 — pnpm com instalação incompleta e store global inacessível

**Categoria:** Ops | Bug

O projeto voltou a apresentar erro de módulos ausentes mesmo com `node_modules` presente. O caso reproduzido foi `tsc --noEmit` falhando em `app/layout.tsx` com `Cannot find module 'geist/font/sans'` e `geist/font/mono`.

### Causa

- `geist` estava declarado em `sales-trainer/package.json` e no lockfile, mas não existia em `sales-trainer/node_modules/.pnpm`.
- O comando `pnpm` dentro do sandbox falhava antes de instalar com `unable to open database file`, indicando store/cache global inacessível.
- Forçar store local (`PNPM_HOME`/`PNPM_STORE_DIR`) evitou o erro de banco, mas caiu em `fetch failed` por restrição de rede.

### Correção

Rodar `pnpm install --frozen-lockfile` fora do sandbox reconstruiu a instalação e baixou os pacotes ausentes. Depois disso, `node_modules/.bin/tsc --noEmit` passou limpo e `require.resolve()` encontrou `geist/font/sans`, `geist/font/mono`, `pdfjs-dist`, `next` e `@supabase/supabase-js`.

### Padrão operacional

- Se `pnpm` falhar com `unable to open database file`, não assumir bug de código; é problema operacional de store/cache.
- Para diagnosticar módulo ausente, checar simultaneamente `package.json`, `pnpm-lock.yaml`, `node_modules/<pkg>` e `node_modules/.pnpm/<pkg>`.
- Preferir validar com `node_modules/.bin/tsc --noEmit` quando o binário global do `pnpm` estiver quebrado.

---

## 2026-06-05 — Pendência: drag and drop para PDFs da knowledge base

**Categoria:** UI

Pedido do usuário registrado para implementação futura, não executar agora.

### Pendência

Adicionar suporte a arrastar e soltar PDFs no campo de upload da base de conhecimento durante a criação/edição de projeto. Hoje o fluxo aceita upload apenas pelo botão/seletor de arquivo.

### Contexto provável

- Área relacionada: `KnowledgeDocList` / uploads de knowledge base por empresa.
- O fluxo já suporta upload múltiplo sequencial de PDF; a melhoria esperada é aceitar os mesmos arquivos via drop zone, preservando progresso e tratamento de erros por arquivo.
- Manter compatibilidade com o botão atual de selecionar arquivos.

---

## 2026-06-05 — Briefing obrigatório antes da simulação (revertido)

**Categoria:** UI | Arquitetura

Ideia explorada e revertida no mesmo dia porque o entendimento do cliente mudou. Não há implementação ativa.

### Objetivo

Quando o seller clicar em "Conhecer cliente", a experiência deve conduzir para um briefing antes do início da conversa. As informações do briefing precisam ser exibidas de forma clara e o seller só pode começar a simulação depois de confirmar que leu o briefing.

### Contexto atual

- A página `/train/cliente/[profileId]` já mostra dados de empresa, cliente, histórico, contexto da visita, objetivo e critério de sucesso.
- `PreSessionForm` cria a sessão com objetivo/dificuldade e `createSession` redireciona direto para `/train/[sessionId]`.
- Existe `/train/[sessionId]/briefing`, mas hoje a própria página indica que ficou como fluxo legado: se `chosen_objective` já existe, redireciona direto ao chat.

### Direção proposta

- Transformar `/train/[sessionId]/briefing` em etapa obrigatória para sessões ativas ainda não confirmadas.
- Persistir confirmação no banco, por exemplo com `training_sessions.briefing_confirmed_at`.
- Alterar `createSession` para redirecionar para `/train/[sessionId]/briefing`, mesmo quando objetivo/dificuldade já foram escolhidos.
- Proteger `/train/[sessionId]`: se a sessão está ativa e o briefing ainda não foi confirmado, redirecionar de volta para `/train/[sessionId]/briefing`.
- Criar ação server-side para confirmar leitura do briefing e só então navegar para o chat.

### Alternativa preferida pelo usuário

O usuário sugeriu que a experiência não precisa ser uma rota dedicada: pode ser um modal sobre o chat, com fundo desfocado/escurecido e botão "Estou preparado". Essa alternativa mantém a sensação de entrar na sala da simulação, mas bloqueia a conversa até a confirmação.

Para testar rapidamente sem migration, a confirmação deve ser salva no navegador com `localStorage`, usando chave por sessão (`negociarte:briefing-confirmed:<sessionId>`). Isso confirma a leitura apenas naquele navegador/dispositivo e não impede bypass real, mas é suficiente para validar a experiência antes de decidir se vira persistência no banco.

### Status

- Implementação com modal + `localStorage` foi removida.
- Não foi criada migration nem coluna nova no Supabase.
- Se essa demanda voltar, confirmar primeiro o fluxo real desejado com o cliente antes de implementar.

---

## 2026-06-05 — Sessão ativa do mesmo cenário ao clicar em "Conhecer cliente"

**Categoria:** UI | Bug

O problema real não era exigir briefing antes do chat. O fluxo incorreto era: quando o seller já tinha qualquer sessão ativa e clicava em "Conhecer cliente", `/train/cliente/[profileId]` redirecionava imediatamente para a sessão ativa, sem explicar o conflito nem permitir iniciar uma nova simulação do mesmo cenário.

### Decisão

- Se a sessão ativa é de outro cenário, não redirecionar automaticamente; o seller deve conseguir abrir a tela de configuração do cenário que clicou.
- Se a sessão ativa é do mesmo cenário (`training_sessions.customer_profile_id === profileId`), não redirecionar automaticamente.
- Mostrar um modal explicando que já existe uma sessão ativa para aquele cenário.
- Oferecer duas ações:
  - "Abrir sessão atual": leva para `/train/[sessionId]` para o seller gerenciar a sessão existente.
  - "Criar nova sessão": abandona a sessão ativa desse cenário e volta para `/train/cliente/[profileId]`, permitindo configurar objetivo/dificuldade de uma nova simulação.

### Implementação

- Novo componente client `ActiveScenarioSessionModal`.
- Nova server action `abandonActiveScenarioSession`.
- A nova sessão não é criada automaticamente. Depois de abandonar a antiga, o seller retorna para a tela de criação/configuração da simulação.

### Regra de avaliação

Sessões com `status = 'abandoned'` não geram relatório por IA e não devem exibir polling de feedback. Relatório só é gerado quando o usuário escolhe explicitamente encerrar e avaliar (`status = 'completed'`).

### Correção adicional

Não usar `.maybeSingle()` para buscar sessão ativa do seller. Se por bug anterior existir mais de uma sessão ativa, `.maybeSingle()` pode falhar e a página agir como se não houvesse sessão ativa. O fluxo de `/train/cliente/[profileId]` agora busca uma lista ordenada de sessões ativas e só mostra modal quando há sessão ativa do mesmo cenário. Sessões ativas de outros cenários não bloqueiam a tela de configuração do cenário clicado.

<!-- Nova entrada: copie o bloco abaixo e preencha -->
<!--
## YYYY-MM-DD — Título curto

**Categoria:** Arquitetura | Banco | IA | Auth | UI | Ops | Bug

Descrição do aprendizado. Foco no **por que**, não no **o que** (o código já diz o que).
-->

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

<!-- Nova entrada: copie o bloco abaixo e preencha -->
<!--
## YYYY-MM-DD — Título curto

**Categoria:** Arquitetura | Banco | IA | Auth | UI | Ops | Bug

Descrição do aprendizado. Foco no **por que**, não no **o que** (o código já diz o que).
-->

# 2026-05-28 — Join por link, critérios configuráveis e base de conhecimento

Contexto: commit 54115cc (2026-05-27) — maior feature push do projeto.

---

## Join por link de convite

### Fluxo completo
```
Admin copia URL: /join/[join_code]
Seller acessa → JoinAuthForm (login ou cadastro)
  → POST /api/auth/signup-seller (se cadastro novo)
     → cria user no Supabase Auth
     → cria registro em public.profiles com role=seller
     → chama get_or_create_seller_company_link(user_id, company_id)
  → redireciona para /train/welcome
```

### Funções SECURITY DEFINER no banco
- `get_project_by_join_code(code TEXT)` — retorna dados da empresa pelo código; não requer auth
- `get_or_create_seller_company_link(p_seller_id, p_company_id)` — cria entry em `seller_companies` sem precisar de policy insert (chamada via service role no signup-seller)

### Por que SECURITY DEFINER em vez de policy pública
O seller ainda não pertence a uma org quando acessa `/join/[code]`. RLS normal exigiria `organization_id` do usuário para filtrar — impossível antes do login. `SECURITY DEFINER` permite a função rodar com as permissões do dono (postgres) e retornar apenas o que é seguro expor.

---

## Critérios de avaliação configuráveis

### Schema da tabela `evaluation_criteria`
```sql
id, organization_id, company_id (nullable), name, stages JSONB, is_active, created_by
```

`stages` é um array JSONB com estrutura livre — o admin descreve as etapas da venda e comportamentos esperados em linguagem natural. A rota `/api/ai/parse-criteria` usa IA para converter um texto livre em JSONB estruturado.

### Como o evaluator usa
`evaluator.ts` faz SELECT em `evaluation_criteria` filtrando por `organization_id` (e opcionalmente `company_id` da sessão). Se encontrar critérios, injeta no prompt. **Verificar**: se nenhum critério existir, qual é o fallback exato? Ler `evaluator.ts` antes de assumir que há fallback.

### Por que configurável e não hardcoded
Cada empresa-cliente tem um processo de vendas diferente. A Negociarte treina sellers para contextos específicos; o framework de 6 etapas / 11 comportamentos do commit anterior era genérico demais. Agora o admin descreve o processo real da empresa-alvo.

---

## Knowledge base por empresa

### Fluxo de upload
```
Admin faz upload de PDF/DOCX ou cola URL
  → /api/knowledge/upload (multipart) ou /api/knowledge/fetch-url
  → extrai texto com pdf-parse (PDF) ou mammoth (DOCX) ou fetch+DOM (URL)
  → grava em company_knowledge_docs com content_raw
  → AnalyzeKnowledgeDialog chama /api/ai/analyze-knowledge
     → resume/estrutura com IA (modelFor('suggestion'))
     → grava summary em company_knowledge_docs
     → opcionalmente chama updateCompanyContext() para pré-preencher campos da empresa
```

### Integração com chat (a verificar)
Os docs de knowledge estão gravados no banco, mas **não foi confirmado** se o `system_prompt` do chat injeta esse conteúdo em runtime. O `profile-compiler.ts` compila o prompt na criação do perfil — se não houver recompilação, os docs adicionados depois não afetam sessões existentes. Verificar `profile-compiler.ts`.

### Dependências novas
- `pdf-parse` — extrai texto de PDF no servidor
- `mammoth` — extrai texto de DOCX no servidor
Ambas rodam só em Route Handlers (servidor). Não importar em Client Components.

---

## Bug de numeração de migration

Dois arquivos com prefixo `0018`:
- `0018_admin_delete_companies.sql` — add policy de delete para admins
- `0018_project_join_code.sql` — add join_code + funções + políticas

O Supabase CLI aplica por ordem alfabética de nome, então `_admin_delete_companies` roda antes de `_project_join_code`. Em prática, ambos foram aplicados sem conflito. Mas o versionamento está errado — `0018_admin_delete_companies.sql` deveria ser `0017_admin_delete_companies.sql` (ou renumerado para `0019`). Não renumerar em produção sem verificar o histórico do banco.

---

## Pendência crítica: commit do scenario-entities.ts

`lib/actions/scenario-entities.ts` tem 3 mudanças não-commitadas que adicionam `join_code: randomUUID().replace(/-/g, '')` aos inserts de empresas. Sem esse commit, `createScenarioCompany` e `createCompanyQuick` falhariam com constraint NOT NULL violation após a migration 0018_project_join_code ser aplicada.

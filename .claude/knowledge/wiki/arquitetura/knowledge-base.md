# Knowledge base por empresa

**Categoria:** Arquitetura | IA  
**Referência:** `app/api/knowledge/`, `lib/actions/knowledge.ts`, `components/admin/KnowledgeDocList.tsx`, `components/admin/AnalyzeKnowledgeDialog.tsx`

---

## Propósito

Permite ao admin carregar documentos (PDF, DOCX, URL) com contexto real da empresa-cliente. A IA resume o conteúdo e pode pré-preencher automaticamente os campos da empresa (produto, mercado, concorrência).

---

## Arquitetura de rotas

| Rota | O que faz |
|---|---|
| `POST /api/knowledge/upload` | Recebe multipart; extrai texto com `pdf-parse` (PDF) ou `mammoth` (DOCX); grava `content_raw` em `company_knowledge_docs` |
| `POST /api/knowledge/fetch-url` | Faz fetch da URL, extrai texto do HTML; mesmo destino |
| `POST /api/knowledge/compress` | Comprime `content_raw` longo para caber em prompts |
| `POST /api/ai/analyze-knowledge` | Usa `modelFor('suggestion')` para estruturar o conteúdo; grava `summary`; opcionalmente chama `updateCompanyContext()` |

---

## Tabela `company_knowledge_docs`

```
id, organization_id, company_id, title, source_type ('upload'|'url'), 
content_raw TEXT, summary TEXT, analyzed_at, created_by, created_at
```

RLS: isolamento por `organization_id`.

---

## Ponto crítico: knowledge NÃO injeta no chat automaticamente

Os documentos ficam no banco, mas o `system_prompt` do chat é **compilado na criação do perfil** via `profile-compiler.ts`. Se o admin adicionar docs depois de criar o perfil, as sessões existentes **não veem o novo contexto**.

Para usar knowledge em sessões novas, o perfil precisa ser recompilado (botão "Recompilar" — pendente de implementação em `StepPromptPreview`).

**Verificar `profile-compiler.ts`**: confirmar se ele faz JOIN com `company_knowledge_docs` na compilação. Se não fizer, a knowledge base está sendo armazenada mas não consumida pelo chat.

---

## Dependências (servidor-only)

- `pdf-parse` — extrai texto de PDFs
- `mammoth` — extrai texto de DOCX
- Ambas só em Route Handlers. **Não importar em Client Components** — quebra o bundle do browser.

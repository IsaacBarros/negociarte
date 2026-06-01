# Wiki — Sales Trainer

Índice de artigos da knowledge base. Cada categoria agrupa decisões, padrões e contexto que não estão no código.

---

## Arquitetura

_Artigos sobre decisões estruturais, integrações e trade-offs._

<!-- ex.: [Por que OpenRouter em vez de SDK direto](arquitetura/openrouter.md) -->

---

## Banco de Dados

_Schema, políticas RLS, índices e decisões de modelagem._

<!-- ex.: [Estratégia RLS multi-tenant](banco/rls-strategy.md) -->

---

## IA / LLM

_Prompts, modelos, avaliação de qualidade, custo._

- [Competências de Vendas e Estilos de Comportamento](ia/competencias-e-estilos.md) — framework pedagógico da Negociarte: 5 competências avaliadas (com sub-critérios e chaves do schema) e 4 estilos de comportamento de cliente (Analítico, Dominante, Influente, Integrador)

---

## Auth & Papéis

_Fluxo de autenticação, papéis admin/seller, onboarding._

- [Join por link de convite — padrão SECURITY DEFINER pré-auth](auth/join-por-link.md) — como resolver empresa e criar seller antes de ter sessão ativa; quando usar SECURITY DEFINER em vez de policy RLS pública

---

## Arquitetura

_Integrações, pipelines de dados, padrões de Route Handlers._

- [Knowledge base por empresa](arquitetura/knowledge-base.md) — fluxo de upload/análise de docs; por que knowledge NÃO injeta no chat automaticamente sem recompilar o perfil; dependências servidor-only
- [pdfjs-dist v5 em Node.js](arquitetura/pdfjs-dist-node.md) — breaking change workerSrc v4→v5; polyfills necessários; canvasFactory; por que path.resolve funciona em dev e Docker

---

## Componentes & UI

_Padrões visuais, componentes compartilhados, shadcn._

<!-- ex.: [ChatWindow — props e estados internos](ui/chat-window.md) -->

---

## Operações & Deploy

_Variáveis de ambiente, Vercel, n8n, monitoramento._

<!-- ex.: [Checklist de deploy para produção](ops/deploy-checklist.md) -->

---

## Bugs & Decisões de Diagnóstico

_Incidentes resolvidos e por que a solução foi aquela._

<!-- ex.: [Safari streaming bug — causa e fix](bugs/safari-streaming.md) -->

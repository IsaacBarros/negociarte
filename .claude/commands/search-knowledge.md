Pesquise a knowledge base do projeto para responder à pergunta: $ARGUMENTS

Fontes a consultar, nesta ordem de prioridade:

1. `.claude/knowledge/learnings.md` — aprendizados datados e contexto acumulado
2. `.claude/knowledge/wiki/` — artigos temáticos (leia o index.md primeiro para identificar artigos relevantes)
3. `docs/adr/` — decisões de arquitetura formais (ADR-0001 a ADR-0004)
4. `CLAUDE.md` raiz e os CLAUDE.md em `sales-trainer/lib/` e `sales-trainer/components/`

Ao responder:
- Cite a fonte exata (nome do arquivo e seção) para cada informação
- Se a informação não estiver na knowledge base, diga explicitamente e ofereça buscar no código
- Se encontrar informações contraditórias entre fontes, aponte o conflito e indique qual é mais recente

Se nenhuma fonte contiver a resposta, sugira onde essa informação deveria ser documentada e ofereça criar o artigo wiki correspondente.

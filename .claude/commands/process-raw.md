Processe todos os arquivos em `.claude/knowledge/raw/` e incorpore o conteúdo na knowledge base estruturada.

Para cada arquivo em `.claude/knowledge/raw/`:

1. Leia o conteúdo do arquivo.
2. Classifique o aprendizado em uma das categorias: Arquitetura, Banco, IA, Auth, UI, Ops, Bug.
3. Extraia o que é **não-óbvio** — o que não está no código, no git log ou nos ADRs.
4. Adicione uma entrada datada em `.claude/knowledge/learnings.md` no formato:

```
## YYYY-MM-DD — Título curto

**Categoria:** <categoria>

<conteúdo processado — foco no por que, não no o que>
```

5. Se o conteúdo for longo ou temático o suficiente para merecer um artigo próprio, crie o arquivo em `.claude/knowledge/wiki/<categoria>/` e adicione o link em `.claude/knowledge/wiki/index.md`.

6. Após processar todos os arquivos, mova-os de `raw/` para uma subpasta `raw/processed/YYYY-MM-DD/` para manter histórico.

Ao final, mostre um resumo: quantos arquivos foram processados e quais entradas foram adicionadas.

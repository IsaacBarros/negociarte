# pdfjs-dist v5 em Node.js — workerSrc obrigatório

## Contexto

O projeto migrou de `pdf-parse` (que usava pdfjs-dist internamente) para `pdfjs-dist` direto. A extração de PDF passou a retornar 422 com erro genérico. O `catch {}` na rota engolia o erro real.

## Root cause

Em **pdfjs-dist v4**, `GlobalWorkerOptions.workerSrc = ''` era a forma padrão de desabilitar web workers em Node.js e processar no thread principal.

Em **pdfjs-dist v5**, isso mudou:

```
Error: Setting up fake worker failed: "No 'GlobalWorkerOptions.workerSrc' specified."
```

String vazia é tratada como "nenhum worker especificado" e lança erro imediatamente.

## Fix

```ts
import path from 'path'

// Aponta para o arquivo worker real — pdfjs-dist v5 exige path válido
pdfjsLib.GlobalWorkerOptions.workerSrc = path.resolve(
  'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
)
```

`path.resolve(...)` usa `process.cwd()` como base. No Next.js isso aponta para a raiz do projeto em dev e em Docker standalone — exatamente onde `node_modules/pdfjs-dist/` vive.

## Outros detalhes da integração

- **Import path**: `pdfjs-dist/legacy/build/pdf.mjs` (não o build principal). Legacy build é necessário para compatibilidade com Node.js.
- **serverExternalPackages**: `['pdfjs-dist']` em `next.config.ts` impede o bundler de tentar empacotar o módulo (causa `Object.defineProperty` incompatível).
- **canvasFactory**: injetar via `(params as Record<string, unknown>).canvasFactory = { create: () => ({canvas: null, context: null}), reset: () => {}, destroy: () => {} }` evita que o worker tente carregar `@napi-rs/canvas`. A propriedade não consta nas tipagens públicas mas é aceita em runtime.
- **Polyfills em instrumentation.ts**: `DOMMatrix`, `ImageData`, `Path2D` ainda necessários (pdfjs-dist v5 referencia esses globals no carregamento do módulo no thread principal).

## Arquivo afetado

`sales-trainer/lib/pdf-extract.ts`

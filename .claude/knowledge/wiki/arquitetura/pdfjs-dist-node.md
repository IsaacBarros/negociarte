# pdfjs-dist v5 em Node.js (Next.js App Router)

## Problema

`pdfjs-dist` não funciona em Node.js com a configuração padrão de browser. Mesmo para extração de texto pura (sem renderização), o módulo referencia APIs DOM (`DOMMatrix`, `ImageData`, `Path2D`) no momento do carregamento, e exige um worker file válido para processar documentos.

## Configuração correta (v5+)

### 1. `next.config.ts` — marcar como externo

```ts
serverExternalPackages: ['pdfjs-dist']
```

Impede o bundler (Turbopack ou Webpack) de tentar empacotar o módulo. `pdfjs-dist` usa `Object.defineProperty` de forma incompatível com bundlers.

### 2. `instrumentation.ts` — polyfills antes do primeiro request

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const g = globalThis as Record<string, unknown>
    if (typeof g['DOMMatrix'] === 'undefined') {
      g['DOMMatrix'] = class DOMMatrix { /* stubs */ }
    }
    if (typeof g['ImageData'] === 'undefined') {
      g['ImageData'] = class ImageData { /* stubs */ }
    }
    if (typeof g['Path2D'] === 'undefined') {
      g['Path2D'] = class Path2D { /* stubs */ }
    }
  }
}
```

### 3. `lib/pdf-extract.ts` — import e workerSrc

```ts
import path from 'path'

// @ts-ignore — pdfjs-dist legacy build has no type declarations for this path
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as typeof import('pdfjs-dist')

// v5 BREAKING: workerSrc = '' lança erro. Deve apontar para o arquivo real.
pdfjsLib.GlobalWorkerOptions.workerSrc = path.resolve(
  'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
)

const docParams: Parameters<typeof pdfjsLib.getDocument>[0] = {
  data: new Uint8Array(buffer),
  useSystemFonts: true,
  disableFontFace: true,
  isEvalSupported: false,
}
// canvasFactory não consta nas tipagens públicas mas é aceito em runtime.
// Evita que o worker tente carregar @napi-rs/canvas.
;(docParams as Record<string, unknown>).canvasFactory = {
  create: (_w: number, _h: number) => ({ canvas: null, context: null }),
  reset: () => {},
  destroy: () => {},
}
```

## Breaking change v4 → v5

| v4 | v5 |
|---|---|
| `workerSrc = ''` desabilitava workers (processava no thread principal) | `workerSrc = ''` lança `"Setting up fake worker failed: No 'GlobalWorkerOptions.workerSrc' specified."` |
| Workers eram opcionais | Worker file é obrigatório |

## Por que `path.resolve`

`path.resolve('node_modules/...')` usa `process.cwd()` como base. No Next.js:
- **Dev**: `process.cwd()` = raiz do projeto
- **Docker standalone**: `process.cwd()` = `/app` (onde node_modules/ vive)

Não depende de `import.meta.url` (indisponível em CJS compilado pelo Next.js) nem de path absoluto hardcoded.

## Armadilha comum

`catch {}` sem logging em route handlers esconde completamente o erro:

```ts
// ❌ — impossível diagnosticar o que falhou
try {
  const result = await extractPdfText(buffer)
} catch {
  return NextResponse.json({ error: 'Falha ao extrair PDF.' }, { status: 422 })
}

// ✅
} catch (e) {
  console.error('[pdf-extract]', e)
  return NextResponse.json({ error: 'Falha ao extrair PDF.' }, { status: 422 })
}
```

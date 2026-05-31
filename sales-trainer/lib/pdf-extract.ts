const MAX_PDF_TEXT_CHARS = 150_000

/**
 * Extrai texto de um buffer PDF usando pdfjs-dist diretamente.
 * Usa dynamic import para garantir que os polyfills do instrumentation.ts
 * já estejam em vigor. Fornece CanvasFactory e CMapReaderFactory mínimos
 * para evitar tentativas de carregamento de @napi-rs/canvas.
 */
export async function extractPdfText(buffer: Buffer): Promise<{ text: string; truncated: boolean }> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — pdfjs-dist legacy build has no bundled type declarations for this path
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as typeof import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
    canvasFactory: {
      create: (_w: number, _h: number) => ({ canvas: null as unknown as HTMLCanvasElement, context: null as unknown as CanvasRenderingContext2D }),
      reset: () => {},
      destroy: () => {},
    },
  })

  const pdf = await loadingTask.promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: unknown) => (item !== null && typeof item === 'object' && 'str' in item ? (item as { str: string }).str : ''))
      .join(' ')
    pages.push(pageText)
    page.cleanup()
  }

  await pdf.destroy()

  let text = pages.join('\n').replace(/[ \t]+/g, ' ').trim()
  const truncated = text.length > MAX_PDF_TEXT_CHARS
  if (truncated) text = text.slice(0, MAX_PDF_TEXT_CHARS)

  return { text, truncated }
}

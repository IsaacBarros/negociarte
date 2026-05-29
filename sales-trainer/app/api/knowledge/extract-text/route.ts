import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { PDFParse } from 'pdf-parse'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_TEXT_CHARS = 150_000
const MAX_FILE_SIZE = 4 * 1024 * 1024

export async function POST(request: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Limite: 4MB.' }, { status: 413 })
  }

  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
  const isTxt = file.type === 'text/plain' || file.name.endsWith('.txt')

  if (!isPdf && !isTxt) {
    return NextResponse.json({ error: 'Apenas PDF ou TXT são aceitos.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let extractedText = ''

  if (isTxt) {
    extractedText = buffer.toString('utf-8').trim()
  } else {
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      const result = await parser.getText()
      extractedText = result.text.trim()
      await parser.destroy()
    } catch {
      return NextResponse.json(
        { error: 'Falha ao extrair texto do PDF. Verifique se o arquivo não está protegido.' },
        { status: 422 },
      )
    }
  }

  if (!extractedText) {
    return NextResponse.json(
      { error: 'Nenhum texto encontrado. O arquivo pode conter apenas imagens.' },
      { status: 422 },
    )
  }

  const truncated = extractedText.length > MAX_TEXT_CHARS
  if (truncated) extractedText = extractedText.slice(0, MAX_TEXT_CHARS)

  return NextResponse.json({ text: extractedText, chars: extractedText.length, truncated })
}

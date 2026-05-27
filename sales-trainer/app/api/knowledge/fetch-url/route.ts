import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_TEXT_CHARS = 150_000

const BodySchema = z.object({
  company_id: z.string().uuid(),
  url: z.string().url(),
  title: z.string().min(1).max(200).optional(),
})

/** Remove tags HTML e retorna texto limpo */
function stripHtml(html: string): string {
  // Remove scripts e styles completos
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    // Transforma <br>, <p>, <div>, <li>, <tr> em quebra de linha
    .replace(/<(br|p|div|li|tr|h[1-6]|blockquote)[^>]*>/gi, '\n')
    // Remove todas as demais tags
    .replace(/<[^>]+>/g, ' ')
    // Decodifica entidades HTML comuns
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Normaliza espaços em branco
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text
}

export async function POST(request: Request) {
  // Autenticação — apenas admins
  let user: Awaited<ReturnType<typeof requireAdmin>>
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 })
  }

  const { company_id, url, title: titleOverride } = parsed.data

  const supabase = await createClient()

  // Verificar que a empresa pertence à org do admin
  const { data: company, error: companyError } = await supabase
    .from('scenario_companies')
    .select('id')
    .eq('id', company_id)
    .eq('organization_id', user.organization_id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
  }

  // Buscar conteúdo da URL
  let html = ''
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Negociarte-Bot/1.0' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      return NextResponse.json(
        { error: `A URL retornou status ${response.status}.` },
        { status: 422 },
      )
    }
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return NextResponse.json(
        { error: 'URL não retornou HTML ou texto.' },
        { status: 422 },
      )
    }
    html = await response.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Falha ao acessar a URL: ${msg}` }, { status: 422 })
  }

  let extractedText = stripHtml(html)
  if (!extractedText) {
    return NextResponse.json({ error: 'Nenhum texto encontrado na URL.' }, { status: 422 })
  }

  const truncated = extractedText.length > MAX_TEXT_CHARS
  if (truncated) {
    extractedText = extractedText.slice(0, MAX_TEXT_CHARS)
  }

  // Título: override fornecido, ou hostname extraído da URL
  const title = titleOverride ?? new URL(url).hostname

  // Salvar no banco
  const { data: doc, error: insertError } = await supabase
    .from('company_knowledge_docs')
    .insert({
      organization_id: user.organization_id,
      company_id,
      title,
      source_type: 'url',
      source_url: url,
      extracted_text: extractedText,
      is_active: true,
    })
    .select('id, title, source_type, is_active, created_at')
    .single()

  if (insertError || !doc) {
    return NextResponse.json({ error: 'Erro ao salvar documento.' }, { status: 500 })
  }

  return NextResponse.json({
    doc,
    truncated,
    chars: extractedText.length,
  })
}

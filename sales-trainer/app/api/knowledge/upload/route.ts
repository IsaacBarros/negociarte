import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { z } from 'zod'
import { extractPdfText } from '@/lib/pdf-extract'

export const runtime = 'nodejs'
export const maxDuration = 60

const QuerySchema = z.object({
  company_id: z.string().uuid(),
})

export async function POST(request: Request) {
  // Autenticação — apenas admins
  let user: Awaited<ReturnType<typeof requireAdmin>>
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Parse do form-data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const companyIdRaw = formData.get('company_id')
  const file = formData.get('file')

  const queryParsed = QuerySchema.safeParse({ company_id: companyIdRaw })
  if (!queryParsed.success) {
    return NextResponse.json({ error: 'company_id inválido.' }, { status: 400 })
  }
  const { company_id } = queryParsed.data

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos.' }, { status: 400 })
  }

  // Limite de 4MB (Vercel body limit)
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Arquivo muito grande. Limite: 4MB.' },
      { status: 413 },
    )
  }

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

  // Extrair texto do PDF
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let extractedText = ''
  let truncated = false
  try {
    const result = await extractPdfText(buffer)
    extractedText = result.text
    truncated = result.truncated
  } catch {
    return NextResponse.json(
      { error: 'Falha ao extrair texto do PDF. Verifique se o arquivo não está protegido.' },
      { status: 422 },
    )
  }

  if (!extractedText) {
    return NextResponse.json(
      { error: 'Nenhum texto encontrado no PDF. O arquivo pode conter apenas imagens.' },
      { status: 422 },
    )
  }

  // Upload do arquivo original para o Supabase Storage
  const fileName = `${user.organization_id}/${company_id}/${Date.now()}_${file.name}`
  const { error: storageError } = await supabase.storage
    .from('company-knowledge')
    .upload(fileName, buffer, { contentType: 'application/pdf', upsert: false })

  // Storage é opcional — se não configurado, continuamos sem URL
  const source_url = storageError ? null : fileName

  // Salvar registro no banco
  const { data: doc, error: insertError } = await supabase
    .from('company_knowledge_docs')
    .insert({
      organization_id: user.organization_id,
      company_id,
      title: file.name.replace(/\.pdf$/i, ''),
      source_type: 'pdf',
      source_url,
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

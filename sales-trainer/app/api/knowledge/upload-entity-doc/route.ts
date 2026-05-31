import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { z } from 'zod'
import { extractPdfText } from '@/lib/pdf-extract'

export const runtime = 'nodejs'
export const maxDuration = 60

const CUSTOMER_FIELDS = [
  'business_profile',
  'pain_objections',
  'relationship_history',
] as const

const CRITERIA_FIELDS = ['sales_process', 'competencies'] as const

type CustomerField = (typeof CUSTOMER_FIELDS)[number]
type CriteriaField = (typeof CRITERIA_FIELDS)[number]

const InputSchema = z.discriminatedUnion('entity_type', [
  z.object({
    entity_type: z.literal('customer'),
    entity_id: z.string().uuid(),
    field: z.enum(CUSTOMER_FIELDS),
  }),
  z.object({
    entity_type: z.literal('criteria'),
    entity_id: z.string().uuid(),
    field: z.enum(CRITERIA_FIELDS),
  }),
])

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof requireAdmin>>
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const parsed = InputSchema.safeParse({
    entity_type: formData.get('entity_type'),
    entity_id: formData.get('entity_id'),
    field: formData.get('field'),
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos.', issues: parsed.error.issues }, { status: 400 })
  }

  const { entity_type, entity_id, field } = parsed.data
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos.' }, { status: 400 })
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Limite: 4MB.' }, { status: 413 })
  }

  const supabase = await createClient()

  // Verificar ownership
  if (entity_type === 'customer') {
    const { data } = await supabase
      .from('scenario_customers')
      .select('id')
      .eq('id', entity_id)
      .eq('organization_id', user.organization_id)
      .single()
    if (!data) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  } else {
    const { data } = await supabase
      .from('evaluation_criteria')
      .select('id')
      .eq('id', entity_id)
      .eq('organization_id', user.organization_id)
      .single()
    if (!data) return NextResponse.json({ error: 'Critério não encontrado.' }, { status: 404 })
  }

  // Extrair texto
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

  // Upload para storage
  const filePath = `${user.organization_id}/${entity_type}/${entity_id}/${field}_${Date.now()}_${file.name}`
  const { error: storageError } = await supabase.storage
    .from('company-knowledge')
    .upload(filePath, buffer, { contentType: 'application/pdf', upsert: false })
  const savedFilePath = storageError ? null : filePath

  // Atualizar coluna na tabela correspondente (campos explícitos para satisfazer o TypeScript)
  if (entity_type === 'customer') {
    const customerField = field as CustomerField
    const updateData =
      customerField === 'business_profile'
        ? { business_profile_text: extractedText, business_profile_file_path: savedFilePath }
        : customerField === 'pain_objections'
          ? { pain_objections_text: extractedText, pain_objections_file_path: savedFilePath }
          : { relationship_history_text: extractedText, relationship_history_file_path: savedFilePath }

    const { error } = await supabase
      .from('scenario_customers')
      .update(updateData)
      .eq('id', entity_id)
      .eq('organization_id', user.organization_id)
    if (error) return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })
  } else {
    const criteriaField = field as CriteriaField
    const updateData =
      criteriaField === 'sales_process'
        ? { sales_process_text: extractedText, sales_process_file_path: savedFilePath }
        : { competencies_text: extractedText, competencies_file_path: savedFilePath }

    const { error } = await supabase
      .from('evaluation_criteria')
      .update(updateData)
      .eq('id', entity_id)
      .eq('organization_id', user.organization_id)
    if (error) return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })
  }

  return NextResponse.json({
    file_path: savedFilePath,
    extracted_text: extractedText,
    chars: extractedText.length,
    truncated,
  })
}

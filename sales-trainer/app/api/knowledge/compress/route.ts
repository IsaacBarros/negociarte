import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { openrouter } from '@/lib/ai/openrouter'
import { modelFor } from '@/lib/ai/models'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60

const BodySchema = z.object({
  doc_id: z.string().uuid(),
})

const SYSTEM_PROMPT = `Você é um especialista em vendas B2B. Analise o documento abaixo e extraia as informações mais úteis para preparar um vendedor para uma negociação.

Responda apenas com as seções que tiverem informação relevante (omita seções vazias):

## Visão Geral
[O que a empresa faz, porte, mercado de atuação]

## Produtos e Serviços
[Principais produtos/serviços, características e diferenciais]

## Posicionamento de Mercado
[Como se posiciona vs. concorrência, proposta de valor central]

## Clientes-Alvo
[Perfil dos clientes ideais, segmentos, características]

## Argumentos Principais de Venda
[Os 3-5 pontos mais fortes para usar em negociação]

## Objeções Comuns e Como Tratar
[Objeções típicas que surgem e as melhores respostas]

Seja objetivo e direto. Priorize informações práticas para vendedores.`

export async function POST(request: Request) {
  // Auth — apenas admins
  let user: Awaited<ReturnType<typeof requireAdmin>>
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'doc_id inválido.' }, { status: 400 })
  }

  const { doc_id } = parsed.data
  const supabase = await createClient()

  // Buscar documento e verificar ownership
  const { data: doc, error: fetchError } = await supabase
    .from('company_knowledge_docs')
    .select('id, extracted_text, organization_id')
    .eq('id', doc_id)
    .eq('organization_id', user.organization_id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  }

  if (!doc.extracted_text) {
    return NextResponse.json({ error: 'Documento sem texto extraído.' }, { status: 422 })
  }

  const original_chars = doc.extracted_text.length

  // Compressão via IA
  let compressedText: string
  try {
    const { text } = await generateText({
      model: openrouter(modelFor('suggestion')),
      system: SYSTEM_PROMPT,
      prompt: `DOCUMENTO:\n---\n${doc.extracted_text}\n---`,
    })
    compressedText = text.trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json(
      { error: `Falha na compressão: ${msg}` },
      { status: 500 },
    )
  }

  if (!compressedText) {
    return NextResponse.json({ error: 'Nenhum conteúdo gerado pela IA.' }, { status: 500 })
  }

  // Salvar texto comprimido no banco
  const { error: updateError } = await supabase
    .from('company_knowledge_docs')
    .update({ extracted_text: compressedText })
    .eq('id', doc_id)

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao salvar texto comprimido.' }, { status: 500 })
  }

  return NextResponse.json({
    chars: compressedText.length,
    original_chars,
  })
}

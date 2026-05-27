'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const AddTextSchema = z.object({
  company_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(150_000),
})

const ToggleSchema = z.object({
  doc_id: z.string().uuid(),
  is_active: z.boolean(),
})

const DeleteSchema = z.object({
  doc_id: z.string().uuid(),
})

/** Adiciona um documento de texto livre à base de conhecimento */
export async function addTextKnowledgeDoc(rawInput: unknown) {
  const user = await requireAdmin()
  const { company_id, title, text } = AddTextSchema.parse(rawInput)

  const supabase = await createClient()

  // Verificar que a empresa pertence à org do admin
  const { data: company, error: companyError } = await supabase
    .from('scenario_companies')
    .select('id')
    .eq('id', company_id)
    .eq('organization_id', user.organization_id)
    .single()

  if (companyError || !company) throw new Error('Empresa não encontrada.')

  const { data: doc, error: insertError } = await supabase
    .from('company_knowledge_docs')
    .insert({
      organization_id: user.organization_id,
      company_id,
      title,
      source_type: 'text',
      source_url: null,
      extracted_text: text,
      is_active: true,
    })
    .select('id, title, source_type, source_url, extracted_text, is_active, created_at, updated_at, organization_id, company_id')
    .single()

  if (insertError || !doc) throw new Error('Erro ao salvar documento.')

  revalidatePath('/admin/companies')
  return { doc }
}

/** Ativa ou desativa um documento de conhecimento */
export async function toggleKnowledgeDoc(rawInput: unknown) {
  const user = await requireAdmin()
  const { doc_id, is_active } = ToggleSchema.parse(rawInput)

  const supabase = await createClient()

  const { error } = await supabase
    .from('company_knowledge_docs')
    .update({ is_active })
    .eq('id', doc_id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error('Erro ao atualizar documento.')

  revalidatePath('/admin/companies')
}

/** Remove permanentemente um documento de conhecimento */
export async function deleteKnowledgeDoc(rawInput: unknown) {
  const user = await requireAdmin()
  const { doc_id } = DeleteSchema.parse(rawInput)

  const supabase = await createClient()

  // Busca source_url antes de deletar (para remover do Storage se necessário)
  const { data: doc } = await supabase
    .from('company_knowledge_docs')
    .select('source_url, source_type')
    .eq('id', doc_id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!doc) throw new Error('Documento não encontrado.')

  // Remove do banco
  const { error } = await supabase
    .from('company_knowledge_docs')
    .delete()
    .eq('id', doc_id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error('Erro ao remover documento.')

  // Se for PDF com arquivo no Storage, remove também
  if (doc.source_type === 'pdf' && doc.source_url) {
    await supabase.storage.from('company-knowledge').remove([doc.source_url]).catch(() => {
      // Falha silenciosa — banco já foi limpo
    })
  }

  revalidatePath('/admin/companies')
}

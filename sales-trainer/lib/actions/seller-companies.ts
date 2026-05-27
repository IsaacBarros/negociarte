'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const LinkSchema = z.object({
  seller_id: z.string().uuid(),
  company_id: z.string().uuid(),
})

/** Vincula um seller a uma empresa */
export async function linkSellerToCompany(rawInput: unknown) {
  const user = await requireAdmin()
  const { seller_id, company_id } = LinkSchema.parse(rawInput)

  const supabase = await createClient()

  const { error } = await supabase
    .from('seller_companies')
    .insert({
      seller_id,
      company_id,
      organization_id: user.organization_id,
    })
    .select()

  // Ignorar conflito de duplicata (upsert silencioso)
  if (error && !error.message.includes('duplicate')) {
    throw new Error('Erro ao vincular seller à empresa.')
  }

  revalidatePath('/admin/companies')
}

/** Remove vínculo de um seller com uma empresa */
export async function unlinkSellerFromCompany(rawInput: unknown) {
  const user = await requireAdmin()
  const { seller_id, company_id } = LinkSchema.parse(rawInput)

  const supabase = await createClient()

  const { error } = await supabase
    .from('seller_companies')
    .delete()
    .eq('seller_id', seller_id)
    .eq('company_id', company_id)
    .eq('organization_id', user.organization_id)

  if (error) throw new Error('Erro ao remover vínculo.')

  revalidatePath('/admin/companies')
}

/** Define histórico de relacionamento de um seller com um cliente */
export async function setSellerCustomerHistory(rawInput: unknown) {
  const user = await requireAdmin()
  const data = z.object({
    seller_id: z.string().uuid(),
    customer_id: z.string().uuid(),
    history_text: z.string().min(1).max(3000),
  }).parse(rawInput)

  const supabase = await createClient()

  const { error } = await supabase
    .from('seller_customer_history')
    .upsert({
      organization_id: user.organization_id,
      seller_id: data.seller_id,
      customer_id: data.customer_id,
      history_text: data.history_text,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'seller_id,customer_id',
    })

  if (error) throw new Error('Erro ao salvar histórico.')

  revalidatePath('/admin/companies')
}

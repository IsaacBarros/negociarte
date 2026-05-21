import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { updateScenarioCustomer } from '@/lib/actions/scenario-entities'
import { ScenarioEntityForm } from '@/components/profiles/ScenarioEntityForm'
import type { ScenarioCustomerInput } from '@/lib/schemas/scenario-entities'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Editar cliente — Negociarte' }

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('scenario_customers')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!customer) notFound()

  const initialData: Partial<ScenarioCustomerInput> = {
    name: customer.name,
    description: customer.description ?? '',
    buyer_role: customer.buyer_role ?? '',
    pain_points: customer.pain_points ?? '',
    objections: customer.objections ?? '',
    budget_context: customer.budget_context ?? '',
    decision_authority: customer.decision_authority ?? '',
    personality_traits: customer.personality_traits ?? '',
    communication_style: customer.communication_style ?? '',
    confidential_context: customer.confidential_context ?? '',
    is_active: customer.is_active,
  }

  const updateAction = updateScenarioCustomer.bind(null, customer.id)

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/customers" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Clientes
        </Link>
        <h1 className="text-xl font-semibold">{customer.name}</h1>
      </div>
      <ScenarioEntityForm kind="customer" action={updateAction} initialData={initialData} />
    </div>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { updateScenarioCompany } from '@/lib/actions/scenario-entities'
import { ScenarioEntityForm } from '@/components/profiles/ScenarioEntityForm'
import type { ScenarioCompanyInput } from '@/lib/schemas/scenario-entities'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Editar empresa — Negociarte' }

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('scenario_companies')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!company) notFound()

  const initialData: Partial<ScenarioCompanyInput> = {
    name: company.name,
    description: company.description ?? '',
    industry: company.industry ?? '',
    company_size: company.company_size ?? '',
    products_services: Array.isArray(company.products_services)
      ? (company.products_services as { name: string; description: string }[])
      : [{ name: '', description: '' }],
    product_context: company.product_context ?? '',
    market_situation: company.market_situation ?? '',
    competition_context: company.competition_context ?? '',
    marketing_strategy: company.marketing_strategy ?? '',
    is_active: company.is_active,
  }

  const updateAction = updateScenarioCompany.bind(null, company.id)

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/companies" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Empresas
        </Link>
        <h1 className="text-xl font-semibold">{company.name}</h1>
      </div>
      <ScenarioEntityForm kind="company" action={updateAction} initialData={initialData} />
    </div>
  )
}

import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Empresas — Negociarte' }

export default async function CompaniesPage() {
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('scenario_companies')
    .select('id, name, description, industry, company_size, is_active, created_at')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Empresas</h1>
        <Link
          href="/admin/companies/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          + Nova empresa
        </Link>
      </div>

      {!companies?.length && (
        <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-sm text-neutral-500">Nenhuma empresa criada ainda.</p>
        </div>
      )}

      <div className="space-y-3">
        {companies?.map((company) => (
          <div key={company.id} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-2">
              <p className="font-medium">{company.name}</p>
              {!company.is_active && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  Inativa
                </span>
              )}
            </div>
            {company.description && (
              <p className="mt-1 text-sm text-neutral-500">{company.description}</p>
            )}
            {(company.industry || company.company_size) && (
              <p className="mt-2 text-xs text-neutral-400">
                {[company.industry, company.company_size].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

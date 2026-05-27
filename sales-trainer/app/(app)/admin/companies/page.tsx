import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { ArrowRight, Building2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Projetos — Negociarte' }

export default async function CompaniesPage() {
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('scenario_companies')
    .select('id, name, description, industry, company_size, is_active, created_at')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  // Count customer_profiles per company
  const { data: profileRows } = await supabase
    .from('customer_profiles')
    .select('company_id')
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .in('company_id', (companies ?? []).map((c) => c.id))

  const profileCounts: Record<string, number> = {}
  for (const row of profileRows ?? []) {
    const r = row as { company_id: string | null }
    if (r.company_id) profileCounts[r.company_id] = (profileCounts[r.company_id] ?? 0) + 1
  }

  // Count sellers per company
  const { data: sellerRows } = await supabase
    .from('seller_companies')
    .select('company_id')
    .in('company_id', (companies ?? []).map((c) => c.id))

  const sellerCounts: Record<string, number> = {}
  for (const row of sellerRows ?? []) {
    const r = row as { company_id: string }
    sellerCounts[r.company_id] = (sellerCounts[r.company_id] ?? 0) + 1
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projetos</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Cada empresa é um projeto com seus clientes, estilos e critérios.
          </p>
        </div>
        <Link
          href="/admin/companies/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          + Novo projeto
        </Link>
      </div>

      {!companies?.length && (
        <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-20 text-center">
          <Building2 className="mx-auto mb-3 size-8 text-neutral-300" />
          <p className="text-sm text-neutral-500">Nenhum projeto criado ainda.</p>
          <p className="mt-1 text-xs text-neutral-400">
            Crie um projeto para começar a configurar cenários de treino.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {companies?.map((company) => {
          const profiles = profileCounts[company.id] ?? 0
          const sellers = sellerCounts[company.id] ?? 0

          return (
            <div
              key={company.id}
              className="flex items-center gap-4 rounded-xl border border-neutral-200 p-5 hover:border-neutral-300 hover:bg-neutral-50/50 transition-colors"
            >
              {/* Icon */}
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                <Building2 className="size-5 text-neutral-500" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-neutral-900">{company.name}</p>
                  {!company.is_active && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                      Inativa
                    </span>
                  )}
                </div>
                {company.description && (
                  <p className="mt-0.5 truncate text-sm text-neutral-500">{company.description}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400">
                  {(company.industry ?? company.company_size) && (
                    <span>{[company.industry, company.company_size].filter(Boolean).join(' · ')}</span>
                  )}
                  <span>{profiles} {profiles === 1 ? 'cenário' : 'cenários'}</span>
                  <span>{sellers} {sellers === 1 ? 'vendedor' : 'vendedores'}</span>
                </div>
              </div>

              {/* CTA */}
              <Link
                href={`/admin/companies/${company.id}`}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
              >
                Gerenciar
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

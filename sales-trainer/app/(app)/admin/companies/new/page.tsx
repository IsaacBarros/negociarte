import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createScenarioCompany } from '@/lib/actions/scenario-entities'
import { ScenarioEntityForm } from '@/components/profiles/ScenarioEntityForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nova empresa — Negociarte' }

export default async function NewCompanyPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/companies" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Empresas
        </Link>
        <h1 className="text-xl font-semibold">Nova empresa</h1>
      </div>
      <ScenarioEntityForm kind="company" action={createScenarioCompany} />
    </div>
  )
}

import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createScenarioCustomer } from '@/lib/actions/scenario-entities'
import { ScenarioEntityForm } from '@/components/profiles/ScenarioEntityForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Novo cliente — Negociarte' }

export default async function NewCustomerPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/customers" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Clientes
        </Link>
        <h1 className="text-xl font-semibold">Novo cliente</h1>
      </div>
      <ScenarioEntityForm kind="customer" action={createScenarioCustomer} />
    </div>
  )
}

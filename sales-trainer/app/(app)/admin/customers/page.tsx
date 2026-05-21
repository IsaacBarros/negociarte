import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clientes — Negociarte' }

export default async function CustomersPage() {
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('scenario_customers')
    .select('id, name, description, buyer_role, communication_style, is_active, created_at')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Link
          href="/admin/customers/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          + Novo cliente
        </Link>
      </div>

      {!customers?.length && (
        <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-sm text-neutral-500">Nenhum cliente criado ainda.</p>
        </div>
      )}

      <div className="space-y-3">
        {customers?.map((customer) => (
          <Link
            key={customer.id}
            href={`/admin/customers/${customer.id}`}
            className="block rounded-lg border border-neutral-200 p-4 hover:border-neutral-400 hover:bg-neutral-50"
          >
            <div className="flex items-center gap-2">
              <p className="font-medium">{customer.name}</p>
              {!customer.is_active && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  Inativo
                </span>
              )}
            </div>
            {customer.description && (
              <p className="mt-1 text-sm text-neutral-500">{customer.description}</p>
            )}
            {(customer.buyer_role ?? customer.communication_style) && (
              <p className="mt-2 text-xs text-neutral-400">
                {[customer.buyer_role, customer.communication_style].filter(Boolean).join(' · ')}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

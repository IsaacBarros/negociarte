import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { NewCompanyFlow } from '@/components/admin/NewCompanyFlow'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Novo projeto — Negociarte' }

export default async function NewCompanyPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/companies" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Projetos
        </Link>
        <h1 className="text-xl font-semibold">Novo projeto</h1>
      </div>
      <NewCompanyFlow />
    </div>
  )
}

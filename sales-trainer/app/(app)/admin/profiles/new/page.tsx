import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createProfile } from '@/lib/actions/profiles'
import { BuilderForm } from '@/components/profile-builder/builder-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Novo perfil — Negociarte' }

export default async function NewProfilePage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/profiles" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Perfis
        </Link>
        <h1 className="text-xl font-semibold">Novo perfil de cliente</h1>
      </div>
      <BuilderForm action={createProfile} submitLabel="Criar perfil" />
    </div>
  )
}

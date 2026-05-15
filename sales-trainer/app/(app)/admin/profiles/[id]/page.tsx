import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/actions/profiles'
import { BuilderForm } from '@/components/profile-builder/builder-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Editar perfil — Sales Trainer' }

export default async function EditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: profileRaw } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!profileRaw) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileRaw as any
  const action = updateProfile.bind(null, id)

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/profiles" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Perfis
        </Link>
        <h1 className="text-xl font-semibold">Editar: {profile.name as string}</h1>
      </div>
      <BuilderForm initialData={profile} action={action} submitLabel="Salvar alterações" />
    </div>
  )
}

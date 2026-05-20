import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/actions/profiles'
import { ProfileFormLayout } from '@/components/profiles/ProfileFormLayout'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Editar cenário — Negociarte' }

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
  const [{ data: companies }, { data: customers }] = await Promise.all([
    supabase
      .from('scenario_companies')
      .select('id, name, description')
      .eq('organization_id', user.organization_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('scenario_customers')
      .select('id, name, description, buyer_role')
      .eq('organization_id', user.organization_id)
      .eq('is_active', true)
      .order('name'),
  ])

  const action = updateProfile.bind(null, id)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/profiles" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Cenários
        </Link>
        <h1 className="text-xl font-semibold">Editar cenário: {profileRaw.name}</h1>
      </div>
      <ProfileFormLayout
        mode="edit"
        orgId={user.organization_id}
        profileId={id}
        initialData={profileRaw}
        action={action}
        submitLabel="Salvar alterações"
        companies={companies ?? []}
        customers={customers ?? []}
      />
    </div>
  )
}

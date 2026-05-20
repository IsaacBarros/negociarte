import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createProfile } from '@/lib/actions/profiles'
import { createClient } from '@/lib/supabase/server'
import { ProfileFormLayout } from '@/components/profiles/ProfileFormLayout'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Novo cenário — Negociarte' }

export default async function NewProfilePage() {
  const user = await requireAdmin()
  const supabase = await createClient()
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/profiles" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Cenários
        </Link>
        <h1 className="text-xl font-semibold">Novo cenário</h1>
      </div>
      <ProfileFormLayout
        mode="create"
        orgId={user.organization_id}
        action={createProfile}
        submitLabel="Criar cenário"
        companies={companies ?? []}
        customers={customers ?? []}
      />
    </div>
  )
}

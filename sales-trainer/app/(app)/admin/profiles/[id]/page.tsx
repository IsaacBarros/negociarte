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

  const companyId = profileRaw.company_id

  const [{ data: customers }, { data: behaviorStyles }, { data: activeCriteriaRaw }] =
    await Promise.all([
      companyId
        ? supabase
            .from('scenario_customers')
            .select(
              'id, name, description, buyer_role, pain_points, objections, budget_context, decision_authority, personality_traits, communication_style, confidential_context, updated_at, business_profile_text, pain_objections_text, relationship_history_text',
            )
            .eq('company_id', companyId)
            .eq('organization_id', user.organization_id)
            .eq('is_active', true)
            .order('name')
        : supabase
            .from('scenario_customers')
            .select(
              'id, name, description, buyer_role, pain_points, objections, budget_context, decision_authority, personality_traits, communication_style, confidential_context, updated_at, business_profile_text, pain_objections_text, relationship_history_text',
            )
            .eq('organization_id', user.organization_id)
            .eq('is_active', true)
            .order('name'),
      supabase
        .from('behavior_styles')
        .select('id, name, description, simulation_guidance, evaluation_criteria, is_active')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
        .order('name'),
      companyId
        ? supabase
            .from('evaluation_criteria')
            .select(
              'id, name, stages, total_points, is_active, sales_process_text, sales_process_file_path, style_alignment_text, style_alignment_file_path, result_adherence_text, result_adherence_file_path, competencies_text, competencies_file_path, custom_criteria',
            )
            .eq('company_id', companyId)
            .eq('is_active', true)
            .single()
        : Promise.resolve({ data: null }),
    ])

  const action = updateProfile.bind(null, id)

  const backHref = companyId
    ? `/admin/companies/${companyId}?tab=scenarios`
    : '/admin/profiles'

  type CriteriaRaw = {
    id: string
    name: string
    stages: unknown
    total_points: number
    is_active: boolean
    sales_process_text: string | null
    sales_process_file_path: string | null
    style_alignment_text: string | null
    style_alignment_file_path: string | null
    result_adherence_text: string | null
    result_adherence_file_path: string | null
    competencies_text: string | null
    competencies_file_path: string | null
    custom_criteria: unknown
  }

  const raw = activeCriteriaRaw as CriteriaRaw | null
  const activeCriteria = raw
    ? {
        id: raw.id,
        name: raw.name,
        stages: raw.stages as { key: string; label: string; behaviors: { key: string; label: string; weight: number }[] }[],
        total_points: raw.total_points,
        is_active: raw.is_active,
        sales_process_text: raw.sales_process_text,
        sales_process_file_path: raw.sales_process_file_path,
        style_alignment_text: raw.style_alignment_text,
        style_alignment_file_path: raw.style_alignment_file_path,
        result_adherence_text: raw.result_adherence_text,
        result_adherence_file_path: raw.result_adherence_file_path,
        competencies_text: raw.competencies_text,
        competencies_file_path: raw.competencies_file_path,
        custom_criteria: raw.custom_criteria,
      }
    : null

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={backHref} className="text-sm text-neutral-500 hover:text-neutral-900">
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
        cancelHref={backHref}
        companyId={companyId ?? undefined}
        customers={customers ?? []}
        behaviorStyles={behaviorStyles ?? []}
        activeCriteria={activeCriteria}
      />
    </div>
  )
}

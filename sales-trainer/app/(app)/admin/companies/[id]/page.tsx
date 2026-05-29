import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { updateScenarioCompany } from '@/lib/actions/scenario-entities'
import { ScenarioEntityForm } from '@/components/profiles/ScenarioEntityForm'
import { KnowledgeDocList } from '@/components/admin/KnowledgeDocList'
import { ProjectTabs } from '@/components/admin/ProjectTabs'
import { ScenariosSection } from '@/components/admin/ScenariosSection'
import { AccessSection } from '@/components/admin/AccessSection'
import { BehaviorStylesSection } from '@/components/admin/BehaviorStylesSection'
import { CriteriaManagerSection } from '@/components/admin/CriteriaManagerSection'
import { DeleteCompanyButton } from '@/components/admin/DeleteCompanyButton'
import type { ScenarioCompanyInput } from '@/lib/schemas/scenario-entities'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Projeto — Negociarte' }

const VALID_TABS = ['context', 'scenarios', 'styles', 'criteria', 'access'] as const
type Tab = (typeof VALID_TABS)[number]

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const rawTab = typeof sp.tab === 'string' ? sp.tab : 'context'
  const tab: Tab = (VALID_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as Tab)
    : 'context'

  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('scenario_companies')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!company) notFound()

  // Contagens para o dialog de exclusão
  const { data: companyProfileIds } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('company_id', id)
    .eq('organization_id', user.organization_id)

  const pIds = (companyProfileIds ?? []).map((p) => (p as { id: string }).id)

  const { count: deleteSessionCount } = pIds.length
    ? await supabase
        .from('training_sessions')
        .select('id', { count: 'exact', head: true })
        .in('customer_profile_id', pIds)
        .eq('organization_id', user.organization_id)
    : { count: 0 }

  // ── Tab: context ──────────────────────────────────────────────────────────

  const { data: knowledgeDocs } = tab === 'context'
    ? await supabase
        .from('company_knowledge_docs')
        .select('*')
        .eq('company_id', id)
        .order('created_at', { ascending: true })
    : { data: null }

  // ── Tab: scenarios ────────────────────────────────────────────────────────

  const { data: linkedSellerCompanyRows } = tab === 'scenarios'
    ? await supabase.from('seller_companies').select('seller_id').eq('company_id', id)
    : { data: null }

  const linkedSellerIdsCust = (linkedSellerCompanyRows ?? []).map(
    (r) => (r as { seller_id: string }).seller_id,
  )

  const [{ data: profiles }, { data: linkedSellersForHistory }, { data: sellerHistories }] =
    await Promise.all([
      tab === 'scenarios'
        ? supabase
            .from('customer_profiles')
            .select('id, name, buyer_role, customer_id, scenario_type, difficulty_level')
            .eq('company_id', id)
            .eq('is_active', true)
            .order('name', { ascending: true })
        : { data: null },
      tab === 'scenarios' && linkedSellerIdsCust.length > 0
        ? supabase.from('profiles').select('id, full_name, email').in('id', linkedSellerIdsCust)
        : { data: null },
      tab === 'scenarios'
        ? supabase
            .from('seller_customer_history')
            .select('seller_id, customer_id, history_text')
            .eq('organization_id', user.organization_id)
        : { data: null },
    ])

  // ── Tab: access ───────────────────────────────────────────────────────────

  const [{ data: allSellers }, { data: linkedSellerRows }] = await Promise.all([
    tab === 'access'
      ? supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('organization_id', user.organization_id)
          .eq('role', 'seller')
          .order('full_name', { ascending: true })
      : { data: null },
    tab === 'access'
      ? supabase.from('seller_companies').select('seller_id').eq('company_id', id)
      : { data: null },
  ])

  const linkedSellerIds = (linkedSellerRows ?? []).map(
    (r) => (r as { seller_id: string }).seller_id,
  )

  // ── Tab: styles ───────────────────────────────────────────────────────────

  const { data: behaviorStyles } = tab === 'styles'
    ? await supabase
        .from('behavior_styles')
        .select('id, name, description, simulation_guidance, evaluation_criteria, is_active')
        .eq('organization_id', user.organization_id)
        .order('name', { ascending: true })
    : { data: null }

  // ── Tab: criteria ─────────────────────────────────────────────────────────

  const { data: activeCriteriaRaw } = tab === 'criteria'
    ? await supabase
        .from('evaluation_criteria')
        .select('id, name, stages, total_points, is_active')
        .eq('company_id', id)
        .eq('is_active', true)
        .single()
    : { data: null }

  // ── Derived data ──────────────────────────────────────────────────────────

  type ProfileRaw = {
    id: string
    name: string
    buyer_role: string | null
    customer_id: string | null
    scenario_type: string | null
    difficulty_level: string | null
  }
  type HistoryRaw = { seller_id: string; customer_id: string; history_text: string }
  type SellerProfile = { id: string; full_name: string | null; email: string }

  const linkedSellers = (linkedSellersForHistory ?? []) as SellerProfile[]

  const profilesWithHistories = (profiles ?? []).map((p) => {
    const pr = p as ProfileRaw
    const histories = (sellerHistories ?? [])
      .filter((h) => (h as HistoryRaw).customer_id === pr.customer_id)
      .map((h) => {
        const hr = h as HistoryRaw
        return { seller_id: hr.seller_id, history_text: hr.history_text }
      })
    return { ...pr, histories }
  })

  const initialData: Partial<ScenarioCompanyInput> = {
    name: company.name,
    description: company.description ?? '',
    industry: company.industry ?? '',
    company_size: company.company_size ?? '',
    products_services: Array.isArray(company.products_services)
      ? (company.products_services as { name: string; description: string }[])
      : [{ name: '', description: '' }],
    product_context: company.product_context ?? '',
    market_situation: company.market_situation ?? '',
    competition_context: company.competition_context ?? '',
    marketing_strategy: company.marketing_strategy ?? '',
    is_active: company.is_active,
  }

  const updateAction = updateScenarioCompany.bind(null, company.id)

  type CriteriaRaw = {
    id: string
    name: string
    stages: unknown
    total_points: number
    is_active: boolean
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin/companies" className="text-sm text-neutral-400 hover:text-neutral-700">
            Projetos
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="text-sm font-medium text-neutral-800">{company.name}</span>
          {!company.is_active && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-400">
              Inativa
            </span>
          )}
        </div>
        <DeleteCompanyButton
          companyId={id}
          companyName={company.name}
          profileCount={pIds.length}
          sessionCount={deleteSessionCount ?? 0}
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <ProjectTabs companyId={id} activeTab={tab} />
      </div>

      {/* ── Tab: Contexto ─────────────────────────────────────────────────── */}
      {tab === 'context' && (
        <div className="space-y-10">
          {/* 1. O que você vende */}
          <section>
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">O que a empresa vende</h2>
            <p className="mb-4 text-xs text-neutral-500">
              Preencha o contexto de produto e mercado. Esses dados são injetados em todos os
              cenários de treino deste projeto.
            </p>
            <ScenarioEntityForm kind="company" action={updateAction} initialData={initialData} />
          </section>

          {/* 2. Base de conhecimento */}
          <section>
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">Base de conhecimento</h2>
            <p className="mb-4 text-xs text-neutral-500">
              Suba PDFs, adicione links ou cole textos. A IA analisa e pré-preenche os dados acima
              e gera cenários prontos para treino na aba Cenários.
            </p>
            <KnowledgeDocList
              companyId={id}
              companyName={company.name}
              initialDocs={knowledgeDocs ?? []}
              projectProductContext={company.product_context}
            />
          </section>
        </div>
      )}

      {/* ── Tab: Cenários ─────────────────────────────────────────────────── */}
      {tab === 'scenarios' && (
        <div className="space-y-6">
          <ScenariosSection
            companyId={id}
            projectProductContext={company.product_context}
            profiles={profilesWithHistories}
            sellers={linkedSellers}
          />
        </div>
      )}

      {/* ── Tab: Estilos ──────────────────────────────────────────────────── */}
      {tab === 'styles' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">Estilos de comportamento</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Estilos disponíveis para a organização. Um é sorteado aleatoriamente por sessão.
            </p>
          </div>
          <BehaviorStylesSection
            styles={(behaviorStyles ?? []) as {
              id: string
              name: string
              description: string
              simulation_guidance: string
              evaluation_criteria: string | null
              is_active: boolean
            }[]}
          />
        </div>
      )}

      {/* ── Tab: Critérios ────────────────────────────────────────────────── */}
      {tab === 'criteria' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">Critérios de avaliação</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Define como as simulações desta empresa são avaliadas. Sem critério configurado,
              o sistema usa os 6 estágios padrão da Negociarte.
            </p>
          </div>
          <CriteriaManagerSection
            companyId={id}
            activeCriteria={
              activeCriteriaRaw
                ? {
                    id: (activeCriteriaRaw as CriteriaRaw).id,
                    name: (activeCriteriaRaw as CriteriaRaw).name,
                    stages: (activeCriteriaRaw as CriteriaRaw).stages as {
                      key: string
                      label: string
                      behaviors: { key: string; label: string; weight: number }[]
                    }[],
                    total_points: (activeCriteriaRaw as CriteriaRaw).total_points,
                    is_active: (activeCriteriaRaw as CriteriaRaw).is_active,
                  }
                : null
            }
          />
        </div>
      )}

      {/* ── Tab: Acesso ───────────────────────────────────────────────────── */}
      {tab === 'access' && (
        <AccessSection
          companyId={id}
          joinCode={company.join_code}
          sellers={(allSellers ?? []) as { id: string; full_name: string | null; email: string }[]}
          linkedSellerIds={linkedSellerIds}
        />
      )}
    </div>
  )
}

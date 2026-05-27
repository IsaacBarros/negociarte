import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { updateScenarioCompany } from '@/lib/actions/scenario-entities'
import { ScenarioEntityForm } from '@/components/profiles/ScenarioEntityForm'
import { KnowledgeDocList } from '@/components/admin/KnowledgeDocList'
import { ProjectTabs } from '@/components/admin/ProjectTabs'
import { SellerLinkerSection } from '@/components/admin/SellerLinkerSection'
import { CustomerHistorySection } from '@/components/admin/CustomerHistorySection'
import { BehaviorStylesSection } from '@/components/admin/BehaviorStylesSection'
import { CriteriaManagerSection } from '@/components/admin/CriteriaManagerSection'
import { DeleteCompanyButton } from '@/components/admin/DeleteCompanyButton'
import { JoinCodeSection } from '@/components/admin/JoinCodeSection'
import type { ScenarioCompanyInput } from '@/lib/schemas/scenario-entities'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Projeto — Negociarte' }

const VALID_TABS = ['knowledge', 'customers', 'styles', 'criteria'] as const
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
  const rawTab = typeof sp.tab === 'string' ? sp.tab : 'knowledge'
  const tab: Tab = (VALID_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as Tab)
    : 'knowledge'

  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('scenario_companies')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!company) notFound()

  // ── Contagens para o dialog de exclusão ───────────────────────────────────
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

  // ── Tab 1 — knowledge ──────────────────────────────────────────────────────

  const [{ data: knowledgeDocs }, { data: allSellers }, { data: linkedSellerRows }] =
    await Promise.all([
      tab === 'knowledge'
        ? supabase
            .from('company_knowledge_docs')
            .select('*')
            .eq('company_id', id)
            .order('created_at', { ascending: true })
        : { data: null },
      tab === 'knowledge'
        ? supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('organization_id', user.organization_id)
            .eq('role', 'seller')
            .order('full_name', { ascending: true })
        : { data: null },
      tab === 'knowledge'
        ? supabase
            .from('seller_companies')
            .select('seller_id')
            .eq('company_id', id)
        : { data: null },
    ])

  const linkedSellerIds = (linkedSellerRows ?? []).map((r) => (r as { seller_id: string }).seller_id)

  // ── Tab 2 — customers ─────────────────────────────────────────────────────
  // Fetch seller IDs linked to this company, then fetch their profiles separately
  // (Supabase join omitted: Relationships is [] in generated types)

  const { data: linkedSellerCompanyRows } = tab === 'customers'
    ? await supabase
        .from('seller_companies')
        .select('seller_id')
        .eq('company_id', id)
    : { data: null }

  const linkedSellerIdsCust = (linkedSellerCompanyRows ?? []).map(
    (r) => (r as { seller_id: string }).seller_id,
  )

  const [{ data: profiles }, { data: linkedSellersForHistory }, { data: sellerHistories }] =
    await Promise.all([
      tab === 'customers'
        ? supabase
            .from('customer_profiles')
            .select('id, name, buyer_role, customer_id')
            .eq('company_id', id)
            .eq('is_active', true)
            .order('name', { ascending: true })
        : { data: null },
      tab === 'customers' && linkedSellerIdsCust.length > 0
        ? supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', linkedSellerIdsCust)
        : { data: null },
      tab === 'customers'
        ? supabase
            .from('seller_customer_history')
            .select('seller_id, customer_id, history_text')
            .eq('organization_id', user.organization_id)
        : { data: null },
    ])

  // ── Tab 3 — styles ────────────────────────────────────────────────────────

  const { data: behaviorStyles } = tab === 'styles'
    ? await supabase
        .from('behavior_styles')
        .select('id, name, description, simulation_guidance, evaluation_criteria, is_active')
        .eq('organization_id', user.organization_id)
        .order('name', { ascending: true })
    : { data: null }

  // ── Tab 4 — criteria ──────────────────────────────────────────────────────

  const { data: activeCriteriaRaw } = tab === 'criteria'
    ? await supabase
        .from('evaluation_criteria')
        .select('id, name, stages, total_points, is_active')
        .eq('company_id', id)
        .eq('is_active', true)
        .single()
    : { data: null }

  // ── Derived data ──────────────────────────────────────────────────────────

  type ProfileRaw = { id: string; name: string; buyer_role: string | null; customer_id: string | null }
  type HistoryRaw = { seller_id: string; customer_id: string; history_text: string }

  // Sellers linked to this company (for the history section)
  type SellerProfile = { id: string; full_name: string | null; email: string }
  const linkedSellers = (linkedSellersForHistory ?? []) as SellerProfile[]

  const profilesWithHistories = (profiles ?? []).map((p) => {
    const pr = p as ProfileRaw
    const histories = (sellerHistories ?? [])
      .filter((h) => {
        const hr = h as HistoryRaw
        return hr.customer_id === pr.customer_id
      })
      .map((h) => {
        const hr = h as HistoryRaw
        return { seller_id: hr.seller_id, history_text: hr.history_text }
      })
    return { ...pr, histories }
  })

  // Company initial data for edit form
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

      {/* ── Tab 1: Empresa & Base de Conhecimento ─────────────────────────── */}
      {tab === 'knowledge' && (
        <div className="space-y-8">
          {/* Knowledge docs — primeiro para alimentar a análise IA */}
          <section>
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">
              Base de conhecimento
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              Suba PDFs, adicione links ou cole textos. A IA pode então analisar esses
              documentos e pré-preencher os dados da empresa, personas e estilos.
            </p>
            <KnowledgeDocList
              companyId={id}
              companyName={company.name}
              initialDocs={knowledgeDocs ?? []}
            />
          </section>

          {/* Company edit form */}
          <section>
            <h2 className="mb-4 text-sm font-semibold text-neutral-700">Dados da empresa</h2>
            <ScenarioEntityForm kind="company" action={updateAction} initialData={initialData} />
          </section>

          {/* Join link para vendedores */}
          <section>
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">
              Link de acesso do vendedor
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              Envie este link para os vendedores. Ao acessar, eles são automaticamente
              vinculados ao projeto e podem começar a treinar.
            </p>
            <JoinCodeSection companyId={id} initialCode={company.join_code} />
          </section>

          {/* Seller linking manual */}
          <section>
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">
              Vendedores com acesso
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              Vendedores vinculados por link ou adicionados manualmente aqui.
            </p>
            <SellerLinkerSection
              companyId={id}
              sellers={(allSellers ?? []) as { id: string; full_name: string | null; email: string }[]}
              linkedSellerIds={linkedSellerIds}
            />
          </section>
        </div>
      )}

      {/* ── Tab 2: Clientes ───────────────────────────────────────────────── */}
      {tab === 'customers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-700">Clientes e personas</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Histórico de relacionamento por vendedor. Expanda um cliente para editar.
              </p>
            </div>
            <Link
              href={`/admin/profiles/new`}
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              + Novo cenário
            </Link>
          </div>
          <CustomerHistorySection
            profiles={profilesWithHistories}
            sellers={linkedSellers}
          />
        </div>
      )}

      {/* ── Tab 3: Estilos de Comportamento ──────────────────────────────── */}
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

      {/* ── Tab 4: Critérios de Avaliação ─────────────────────────────────── */}
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
    </div>
  )
}

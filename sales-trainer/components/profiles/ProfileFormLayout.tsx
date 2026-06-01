'use client'

import Link from 'next/link'
import { useState } from 'react'
import { StepBriefing } from '@/components/profiles/steps/StepBriefing'
import { StepPromptPreview } from '@/components/profiles/steps/StepPromptPreview'
import { ClientsSection } from '@/components/admin/ClientsSection'
import { BehaviorStylesSection } from '@/components/admin/BehaviorStylesSection'
import { CriteriaManagerSection } from '@/components/admin/CriteriaManagerSection'
import { GeneratePersonaDialog } from '@/components/profiles/GeneratePersonaDialog'
import type { GenerateResult } from '@/components/profiles/GeneratePersonaDialog'
import { useProfileForm } from '@/hooks/useProfileForm'
import type { CustomerProfileInput } from '@/lib/schemas/profile'
import type { Database } from '@/types/database'

type CustomerProfileRow = Database['public']['Tables']['customer_profiles']['Row']

interface ClientRow {
  id: string
  name: string
  company_name: string | null
  buyer_role: string | null
  chat_model: string | null
  business_profile_text: string | null
  business_profile_file_path: string | null
  pain_objections_text: string | null
  pain_objections_file_path: string | null
  relationship_history_text: string | null
  relationship_history_file_path: string | null
}

interface CustomerDetail {
  id: string
  name: string
  description: string | null
  buyer_role: string | null
  pain_points: string | null
  objections: string | null
  budget_context: string | null
  decision_authority: string | null
  personality_traits: string | null
  communication_style: string | null
  confidential_context: string | null
  updated_at?: string
  business_profile_text?: string | null
  pain_objections_text?: string | null
  relationship_history_text?: string | null
}

interface StyleDetail {
  id: string
  name: string
  description: string
  simulation_guidance: string
  evaluation_criteria: string | null
  is_active: boolean
}

interface CriteriaDetail {
  id: string
  name: string
  stages: { key: string; label: string; behaviors: { key: string; label: string; weight: number }[] }[]
  total_points: number
  is_active: boolean
  sales_process_text?: string | null
  sales_process_file_path?: string | null
  style_alignment_text?: string | null
  style_alignment_file_path?: string | null
  result_adherence_text?: string | null
  result_adherence_file_path?: string | null
  competencies_text?: string | null
  competencies_file_path?: string | null
  custom_criteria?: unknown
}

interface Props {
  initialData?: Partial<CustomerProfileRow>
  action: (data: CustomerProfileInput) => Promise<void>
  mode: 'create' | 'edit'
  orgId: string
  profileId?: string
  submitLabel?: string
  cancelHref?: string
  companyId?: string
  customers?: CustomerDetail[]
  behaviorStyles?: StyleDetail[]
  activeCriteria?: CriteriaDetail | null
}

const tabs = [
  { id: 'clients', label: 'Clientes' },
  { id: 'styles', label: 'Estilos' },
  { id: 'criteria', label: 'Critérios' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'preview', label: 'Preview' },
] as const

type TabId = (typeof tabs)[number]['id']

const FORM_TABS: TabId[] = ['briefing', 'preview']

export function ProfileFormLayout({
  initialData,
  action,
  mode,
  orgId,
  profileId,
  submitLabel = 'Salvar',
  cancelHref = '/admin/profiles',
  companyId,
  customers = [],
  behaviorStyles = [],
  activeCriteria = null,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('clients')
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [localCustomers, setLocalCustomers] = useState(customers)

  const {
    form,
    values,
    onSubmit,
    submitting,
    error,
    suggestField,
    suggestFieldFromDoc,
    suggestingField,
    draftStatus,
    clearDraft,
    completionPercent,
  } = useProfileForm({ initialData, action, mode, orgId, profileId })

  function handleSelectCustomer(id: string) {
    form.setValue('customer_id', id, { shouldDirty: true })
    const customer = localCustomers.find((c) => c.id === id)
    if (!customer) return
    if (customer.buyer_role) form.setValue('buyer_role', customer.buyer_role, { shouldDirty: true })
    // Preferência: campo direto → fallback para texto extraído dos docs
    const painVal = customer.pain_points ?? customer.pain_objections_text ?? null
    if (painVal) form.setValue('pain_points', painVal, { shouldDirty: true })
    if (customer.objections) form.setValue('objections', customer.objections, { shouldDirty: true })
    if (customer.budget_context) form.setValue('budget_context', customer.budget_context, { shouldDirty: true })
    if (customer.decision_authority) form.setValue('decision_authority', customer.decision_authority, { shouldDirty: true })
    if (customer.personality_traits) form.setValue('personality_traits', customer.personality_traits, { shouldDirty: true })
    if (customer.communication_style) form.setValue('communication_style', customer.communication_style, { shouldDirty: true })
    const confidentialVal = customer.confidential_context ?? customer.relationship_history_text ?? null
    if (confidentialVal) form.setValue('confidential_context', confidentialVal, { shouldDirty: true })
    form.setValue('name', customer.name, { shouldDirty: true })
  }

  function handleReloadFromSource() {
    const customerId = form.getValues('customer_id')
    const customer = localCustomers.find((c) => c.id === customerId)
    if (customer) {
      form.setValue('buyer_role', customer.buyer_role ?? '', { shouldDirty: true })
      form.setValue('pain_points', customer.pain_points ?? '', { shouldDirty: true })
      form.setValue('objections', customer.objections ?? '', { shouldDirty: true })
      form.setValue('budget_context', customer.budget_context ?? '', { shouldDirty: true })
      form.setValue('decision_authority', customer.decision_authority ?? '', { shouldDirty: true })
      form.setValue('personality_traits', customer.personality_traits ?? '', { shouldDirty: true })
      form.setValue('communication_style', customer.communication_style ?? '', { shouldDirty: true })
      form.setValue('confidential_context', customer.confidential_context ?? '', { shouldDirty: true })
    }
  }

  function handleGenerateSuccess(result: GenerateResult) {
    setLocalCustomers((prev) => {
      const exists = prev.some((c) => c.id === result.customer.id)
      return exists ? prev : [
        ...prev,
        {
          id: result.customer.id,
          name: result.customer.name,
          description: null,
          buyer_role: result.customer.buyer_role ?? null,
          pain_points: result.customer.pain_points ?? null,
          objections: result.customer.objections ?? null,
          budget_context: result.customer.budget_context ?? null,
          decision_authority: result.customer.decision_authority ?? null,
          personality_traits: result.customer.personality_traits ?? null,
          communication_style: result.customer.communication_style ?? null,
          confidential_context: null,
        },
      ]
    })

    form.setValue('customer_id', result.customer.id, { shouldDirty: true })
    form.setValue('name', result.customer.name, { shouldDirty: true })
    form.setValue('buyer_role', result.customer.buyer_role, { shouldDirty: true })
    form.setValue('pain_points', result.customer.pain_points, { shouldDirty: true })
    form.setValue('objections', result.customer.objections, { shouldDirty: true })
    form.setValue('budget_context', result.customer.budget_context, { shouldDirty: true })
    form.setValue('decision_authority', result.customer.decision_authority, { shouldDirty: true })
    form.setValue('personality_traits', result.customer.personality_traits, { shouldDirty: true })
    form.setValue('communication_style', result.customer.communication_style, { shouldDirty: true })

    form.setValue('industry', result.company.industry, { shouldDirty: true })
    form.setValue('company_size', result.company.company_size, { shouldDirty: true })
    form.setValue('product_context', result.company.product_context, { shouldDirty: true })
    form.setValue('market_situation', result.company.market_situation, { shouldDirty: true })
    form.setValue('competition_context', result.company.competition_context, { shouldDirty: true })
    form.setValue('marketing_strategy', result.company.marketing_strategy, { shouldDirty: true })

    form.setValue('visible_briefing', result.scenario.visible_briefing, { shouldDirty: true })
    form.setValue('visit_objective', result.scenario.visit_objective, { shouldDirty: true })
    form.setValue('success_criteria', result.scenario.success_criteria, { shouldDirty: true })
    form.setValue('confidential_context', result.scenario.confidential_context, { shouldDirty: true })
    form.setValue('sales_process_context', result.scenario.sales_process_context, { shouldDirty: true })
    form.setValue('sales_competencies_context', result.scenario.sales_competencies_context, { shouldDirty: true })

    form.setValue('scenario_type', result.scenario_type, { shouldDirty: true })
    form.setValue('difficulty_level', result.difficulty_level, { shouldDirty: true })

    setActiveTab('briefing')
  }

  const isFormTab = FORM_TABS.includes(activeTab)

  // Build initialClients for ClientsSection from localCustomers shape
  const initialClientsForSection: ClientRow[] = localCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    company_name: null,
    buyer_role: c.buyer_role,
    chat_model: null,
    business_profile_text: c.business_profile_text ?? null,
    business_profile_file_path: null,
    pain_objections_text: c.pain_objections_text ?? null,
    pain_objections_file_path: null,
    relationship_history_text: c.relationship_history_text ?? null,
    relationship_history_file_path: null,
  }))

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <GeneratePersonaDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onSuccess={handleGenerateSuccess}
      />

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {mode === 'create' ? 'Novo cenário' : 'Editar cenário'}
            </p>
            <p className="text-sm text-neutral-500">
              Estrutura: cenário = cliente + regras da simulação.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-neutral-500">
              {draftStatus === 'saving' && 'Salvando rascunho...'}
              {draftStatus === 'saved' && 'Rascunho salvo'}
            </div>
            <button
              type="button"
              onClick={() => setGenerateDialogOpen(true)}
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Gerar persona
            </button>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">{completionPercent}% preenchido</p>
      </div>

      <div className="overflow-x-auto border-b border-neutral-200">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'clients' && companyId && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">Clientes</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Compradores do projeto. Clique em &quot;Usar neste cenário&quot; para associar um cliente a este cenário.
            </p>
          </div>
          <ClientsSection
            companyId={companyId}
            initialClients={initialClientsForSection}
            selectedCustomerId={form.watch('customer_id') ?? undefined}
            onSelectCustomer={handleSelectCustomer}
          />
        </div>
      )}

      {activeTab === 'styles' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">Estilos de comportamento</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Clique em &quot;Usar neste cenário&quot; para fixar um estilo para este cenário.
              Se nenhum for selecionado, o estilo é sorteado aleatoriamente a cada sessão.
            </p>
          </div>
          <BehaviorStylesSection
            styles={behaviorStyles}
            selectedStyleId={form.watch('behavior_style_id') ?? undefined}
            onSelectStyle={(id) => form.setValue('behavior_style_id', id, { shouldDirty: true })}
          />
        </div>
      )}

      {activeTab === 'criteria' && companyId && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">Critérios de avaliação</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Define como as simulações desta empresa são avaliadas. Sem critério configurado,
              o sistema usa os 6 estágios padrão da Negociarte.
            </p>
          </div>
          <CriteriaManagerSection companyId={companyId} activeCriteria={activeCriteria} />
        </div>
      )}

      {activeTab === 'briefing' && (
        <StepBriefing
          form={form}
          suggestField={suggestField}
          suggestFieldFromDoc={suggestFieldFromDoc}
          suggestingField={suggestingField}
        />
      )}

      {activeTab === 'preview' && (
        <StepPromptPreview
          values={values}
          profileUpdatedAt={initialData?.updated_at}
          customerUpdatedAt={localCustomers.find((c) => c.id === values.customer_id)?.updated_at}
          onPromptChange={(p) => form.setValue('system_prompt', p, { shouldDirty: true })}
          onReloadFromSource={handleReloadFromSource}
        />
      )}

      {isFormTab && (
        <div className="sticky bottom-0 z-10 -mx-6 border-t border-neutral-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="min-h-5 text-sm text-red-600">{error}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={cancelHref}
                className="rounded-md px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                Cancelar
              </Link>
              <button
                type="button"
                onClick={() => {
                  form.reset()
                  clearDraft()
                }}
                className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Limpar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

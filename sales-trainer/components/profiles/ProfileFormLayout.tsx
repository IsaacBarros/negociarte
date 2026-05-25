'use client'

import Link from 'next/link'
import { useState } from 'react'
import { StepClient } from '@/components/profiles/steps/StepClient'
import { StepCompany } from '@/components/profiles/steps/StepCompany'
import { StepPromptPreview } from '@/components/profiles/steps/StepPromptPreview'
import { StepScenario } from '@/components/profiles/steps/StepScenario'
import { GeneratePersonaDialog } from '@/components/profiles/GeneratePersonaDialog'
import type { GenerateResult } from '@/components/profiles/GeneratePersonaDialog'
import { useProfileForm } from '@/hooks/useProfileForm'
import type { CustomerProfileInput } from '@/lib/schemas/profile'
import type { Database } from '@/types/database'

type CustomerProfileRow = Database['public']['Tables']['customer_profiles']['Row']

interface Props {
  initialData?: Partial<CustomerProfileRow>
  action: (data: CustomerProfileInput) => Promise<void>
  mode: 'create' | 'edit'
  orgId: string
  profileId?: string
  submitLabel?: string
  companies?: {
    id: string
    name: string
    description: string | null
    industry: string | null
    company_size: string | null
    product_context: string | null
    market_situation: string | null
    competition_context: string | null
    marketing_strategy: string | null
    updated_at?: string
  }[]
  customers?: {
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
  }[]
  behaviorStyles?: {
    id: string
    name: string
    description: string
  }[]
}

const tabs = [
  { id: 'company', label: 'Empresa' },
  { id: 'client', label: 'Cliente' },
  { id: 'scenario', label: 'Cenário' },
  { id: 'preview', label: 'Preview' },
] as const

type TabId = (typeof tabs)[number]['id']

export function ProfileFormLayout({
  initialData,
  action,
  mode,
  orgId,
  profileId,
  submitLabel = 'Salvar',
  companies = [],
  customers = [],
  behaviorStyles = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('company')
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [localCompanies, setLocalCompanies] = useState(companies)
  const [localCustomers, setLocalCustomers] = useState(customers)
  const {
    form,
    values,
    onSubmit,
    submitting,
    error,
    suggestField,
    suggestingField,
    draftStatus,
    clearDraft,
    completionPercent,
  } = useProfileForm({ initialData, action, mode, orgId, profileId })

  function handleGenerateSuccess(result: GenerateResult) {
    setLocalCompanies((prev) => {
      const exists = prev.some((c) => c.id === result.company.id)
      return exists ? prev : [...prev, result.company]
    })
    setLocalCustomers((prev) => {
      const exists = prev.some((c) => c.id === result.customer.id)
      return exists ? prev : [...prev, result.customer]
    })

    form.setValue('company_id', result.company.id, { shouldDirty: true })
    form.setValue('industry', result.company.industry, { shouldDirty: true })
    form.setValue('company_size', result.company.company_size, { shouldDirty: true })
    form.setValue('product_context', result.company.product_context, { shouldDirty: true })
    form.setValue('market_situation', result.company.market_situation, { shouldDirty: true })
    form.setValue('competition_context', result.company.competition_context, { shouldDirty: true })
    form.setValue('marketing_strategy', result.company.marketing_strategy, { shouldDirty: true })

    form.setValue('customer_id', result.customer.id, { shouldDirty: true })
    form.setValue('name', result.customer.name, { shouldDirty: true })
    form.setValue('buyer_role', result.customer.buyer_role, { shouldDirty: true })
    form.setValue('pain_points', result.customer.pain_points, { shouldDirty: true })
    form.setValue('objections', result.customer.objections, { shouldDirty: true })
    form.setValue('budget_context', result.customer.budget_context, { shouldDirty: true })
    form.setValue('decision_authority', result.customer.decision_authority, { shouldDirty: true })
    form.setValue('personality_traits', result.customer.personality_traits, { shouldDirty: true })
    form.setValue('communication_style', result.customer.communication_style, { shouldDirty: true })

    form.setValue('visible_briefing', result.scenario.visible_briefing, { shouldDirty: true })
    form.setValue('visit_objective', result.scenario.visit_objective, { shouldDirty: true })
    form.setValue('success_criteria', result.scenario.success_criteria, { shouldDirty: true })
    form.setValue('confidential_context', result.scenario.confidential_context, { shouldDirty: true })
    form.setValue('sales_process_context', result.scenario.sales_process_context, { shouldDirty: true })
    form.setValue('sales_competencies_context', result.scenario.sales_competencies_context, { shouldDirty: true })

    form.setValue('scenario_type', result.scenario_type, { shouldDirty: true })
    form.setValue('difficulty_level', result.difficulty_level, { shouldDirty: true })

    setActiveTab('company')
  }

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
              Estrutura: cenário = empresa + cliente + regras da simulação.
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

      {activeTab === 'company' && (
        <StepCompany
          form={form}
          suggestField={suggestField}
          suggestingField={suggestingField}
          companies={localCompanies}
        />
      )}
      {activeTab === 'client' && (
        <StepClient
          form={form}
          suggestField={suggestField}
          suggestingField={suggestingField}
          customers={localCustomers}
        />
      )}
      {activeTab === 'scenario' && (
        <StepScenario
          form={form}
          suggestField={suggestField}
          suggestingField={suggestingField}
          behaviorStyles={behaviorStyles}
        />
      )}
      {activeTab === 'preview' && (
        <StepPromptPreview
          values={values}
          profileUpdatedAt={initialData?.updated_at}
          companyUpdatedAt={localCompanies.find((c) => c.id === values.company_id)?.updated_at}
          customerUpdatedAt={localCustomers.find((c) => c.id === values.customer_id)?.updated_at}
        />
      )}

      <div className="sticky bottom-0 z-10 -mx-6 border-t border-neutral-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-h-5 text-sm text-red-600">{error}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/profiles"
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
    </form>
  )
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { StepClient } from '@/components/profiles/steps/StepClient'
import { StepCompany } from '@/components/profiles/steps/StepCompany'
import { StepPromptPreview } from '@/components/profiles/steps/StepPromptPreview'
import { StepScenario } from '@/components/profiles/steps/StepScenario'
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
  }[]
  customers?: {
    id: string
    name: string
    description: string | null
    buyer_role: string | null
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
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('company')
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

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
          <div className="text-sm text-neutral-500">
            {draftStatus === 'saving' && 'Salvando rascunho...'}
            {draftStatus === 'saved' && 'Rascunho salvo'}
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
          companies={companies}
        />
      )}
      {activeTab === 'client' && (
        <StepClient
          form={form}
          suggestField={suggestField}
          suggestingField={suggestingField}
          customers={customers}
        />
      )}
      {activeTab === 'scenario' && (
        <StepScenario form={form} suggestField={suggestField} suggestingField={suggestingField} />
      )}
      {activeTab === 'preview' && <StepPromptPreview values={values} />}

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

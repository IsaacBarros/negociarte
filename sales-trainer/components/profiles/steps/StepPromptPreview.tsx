'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { Check, Copy, AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react'
import { buildPersonaPrompt } from '@/lib/ai/prompts/persona-template'
import type { CustomerProfileInput } from '@/lib/schemas/profile'
import type { Database } from '@/types/database'

type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row']

interface Props {
  values: Partial<CustomerProfileInput>
  profileUpdatedAt?: string | null
  companyUpdatedAt?: string | null
  customerUpdatedAt?: string | null
  onPromptChange?: (prompt: string) => void
  onReloadFromSource?: () => void
}

export function StepPromptPreview({ values, profileUpdatedAt, companyUpdatedAt, customerUpdatedAt, onPromptChange, onReloadFromSource }: Props) {
  const [copied, setCopied] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState('')
  const [reloadPending, setReloadPending] = useState(false)
  const isFirstRender = useRef(true)

  const isStale = useMemo(() => {
    if (!profileUpdatedAt) return false
    const profileDate = new Date(profileUpdatedAt).getTime()
    const companyDate = companyUpdatedAt ? new Date(companyUpdatedAt).getTime() : 0
    const customerDate = customerUpdatedAt ? new Date(customerUpdatedAt).getTime() : 0
    return companyDate > profileDate || customerDate > profileDate
  }, [profileUpdatedAt, companyUpdatedAt, customerUpdatedAt])

  const generatedPrompt = useMemo(() => {
    const asProfile: CustomerProfile = {
      id: '',
      organization_id: '',
      created_by: null,
      company_id: values.company_id ?? null,
      customer_id: values.customer_id ?? null,
      name: values.name ?? '...',
      description: values.description ?? null,
      buyer_role: values.buyer_role ?? null,
      industry: values.industry ?? null,
      company_size: values.company_size ?? null,
      pain_points: values.pain_points ?? null,
      objections: values.objections ?? null,
      budget_context: values.budget_context ?? null,
      decision_authority: values.decision_authority ?? null,
      personality_traits: values.personality_traits ?? null,
      communication_style: values.communication_style ?? null,
      product_context: values.product_context ?? null,
      visible_briefing: values.visible_briefing ?? null,
      visit_objective: values.visit_objective ?? null,
      success_criteria: values.success_criteria ?? null,
      confidential_context: values.confidential_context ?? null,
      sales_process_context: values.sales_process_context ?? null,
      sales_competencies_context: values.sales_competencies_context ?? null,
      market_situation: values.market_situation ?? null,
      competition_context: values.competition_context ?? null,
      marketing_strategy: values.marketing_strategy ?? null,
      scenario_type: values.scenario_type ?? null,
      difficulty_level: values.difficulty_level ?? null,
      behavior_style_id: values.behavior_style_id ?? null,
      chat_model: values.chat_model ?? null,
      available_objectives: null,
      system_prompt: '',
      is_active: values.is_active ?? true,
      created_at: '',
      updated_at: '',
    }

    return buildPersonaPrompt(asProfile)
  }, [values])

  // Sincroniza editedPrompt com o gerado apenas na primeira renderização
  useEffect(() => {
    if (isFirstRender.current) {
      setEditedPrompt(generatedPrompt)
      isFirstRender.current = false
    }
  }, [generatedPrompt])

  // Após reload de campos, sincroniza editedPrompt com o generatedPrompt atualizado
  useEffect(() => {
    if (!reloadPending) return
    setEditedPrompt(generatedPrompt)
    onPromptChange?.('')
    setReloadPending(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedPrompt, reloadPending])

  function handleReload() {
    onReloadFromSource?.()
    setReloadPending(true)
  }

  const isEdited = editedPrompt !== generatedPrompt

  async function copyPrompt() {
    await navigator.clipboard.writeText(editedPrompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <section className="space-y-3">
      {isStale && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="flex-1 text-sm text-amber-800">
            <p className="font-medium">Empresa ou cliente atualizados após a última compilação</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Os campos abaixo refletem o snapshot salvo. Recarregue para sobrescrever com os dados atuais da empresa e do cliente.
            </p>
          </div>
          {onReloadFromSource && (
            <button
              type="button"
              onClick={handleReload}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
            >
              <RefreshCw className="size-3.5" />
              Recarregar campos
            </button>
          )}
        </div>
      )}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Preview do prompt</h2>
            <p className="mt-1 text-sm text-neutral-500">{editedPrompt.length} caracteres</p>
          </div>
          <div className="flex items-center gap-2">
            {isEdited && (
              <button
                type="button"
                onClick={() => { setEditedPrompt(generatedPrompt); onPromptChange?.('') }}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50"
                title="Restaurar prompt gerado automaticamente"
              >
                <RotateCcw className="size-3.5" />
                Restaurar
              </button>
            )}
            <button
              type="button"
              onClick={() => void copyPrompt()}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
        <div className="bg-neutral-50 p-5">
          <textarea
            value={editedPrompt}
            onChange={(e) => { setEditedPrompt(e.target.value); onPromptChange?.(e.target.value) }}
            className="w-full resize-none rounded-md border border-transparent bg-transparent font-mono text-xs leading-relaxed text-neutral-700 focus:border-neutral-300 focus:bg-white focus:outline-none focus:ring-0"
            style={{ minHeight: '400px', maxHeight: '620px' }}
            rows={Math.max(20, editedPrompt.split('\n').length + 2)}
            spellCheck={false}
          />
        </div>
      </div>
    </section>
  )
}

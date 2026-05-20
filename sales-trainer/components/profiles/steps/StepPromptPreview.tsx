'use client'

import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { buildPersonaPrompt } from '@/lib/ai/prompts/persona-template'
import type { CustomerProfileInput } from '@/lib/schemas/profile'
import type { Database } from '@/types/database'

type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row']

interface Props {
  values: Partial<CustomerProfileInput>
}

export function StepPromptPreview({ values }: Props) {
  const [copied, setCopied] = useState(false)

  const prompt = useMemo(() => {
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
      system_prompt: '',
      is_active: values.is_active ?? true,
      created_at: '',
      updated_at: '',
    }

    return buildPersonaPrompt(asProfile)
  }, [values])

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Preview do prompt</h2>
          <p className="mt-1 text-sm text-neutral-500">{prompt.length} caracteres</p>
        </div>
        <button
          type="button"
          onClick={() => void copyPrompt()}
          className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <div className="max-h-[620px] overflow-y-auto bg-neutral-50 p-5">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-700">
          {prompt}
        </pre>
      </div>
    </section>
  )
}

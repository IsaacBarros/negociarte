'use client'

import { useMemo } from 'react'
import type { CustomerProfileInput } from '@/lib/schemas/profile'
import { buildPersonaPrompt } from '@/lib/ai/prompts/persona-template'
import type { Database } from '@/types/database'

type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row']

interface Props {
  values: Partial<CustomerProfileInput>
}

export function PromptPreview({ values }: Props) {
  const prompt = useMemo(() => {
    const asProfile: CustomerProfile = {
      id: '',
      organization_id: '',
      created_by: null,
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
      is_active: true,
      created_at: '',
      updated_at: '',
    }
    return buildPersonaPrompt(asProfile)
  }, [values])

  return (
    <div className="sticky top-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Preview do system prompt</span>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(prompt)}
          className="text-xs text-neutral-400 hover:text-neutral-700"
        >
          Copiar
        </button>
      </div>
      <div className="h-[calc(100vh-10rem)] overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-600">
          {prompt}
        </pre>
      </div>
    </div>
  )
}

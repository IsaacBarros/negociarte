'use client'

import { useMemo, useState, useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CustomerProfileSchema,
  type CustomerProfileInput,
} from '@/lib/schemas/profile'
import type { SessionObjective } from '@/lib/schemas/session'
import { draftKeyFor, useProfileAutoSave } from '@/hooks/useProfileAutoSave'
import type { Database } from '@/types/database'

type CustomerProfileRow = Database['public']['Tables']['customer_profiles']['Row']

interface Options {
  initialData?: Partial<CustomerProfileRow>
  action: (data: CustomerProfileInput) => Promise<void>
  mode: 'create' | 'edit'
  orgId: string
  profileId?: string
}

const formFields = [
  'company_id',
  'customer_id',
  'name',
  'description',
  'buyer_role',
  'industry',
  'company_size',
  'pain_points',
  'objections',
  'budget_context',
  'decision_authority',
  'personality_traits',
  'communication_style',
  'product_context',
  'visible_briefing',
  'visit_objective',
  'success_criteria',
  'confidential_context',
  'sales_process_context',
  'sales_competencies_context',
  'market_situation',
  'competition_context',
  'marketing_strategy',
  'scenario_type',
  'difficulty_level',
  'behavior_style_id',
  'chat_model',
] satisfies (keyof CustomerProfileInput)[]

function readCreateDraft(orgId: string): Partial<CustomerProfileInput> {
  if (typeof window === 'undefined') return {}

  const raw = localStorage.getItem(draftKeyFor('create', orgId))
  if (!raw) return {}

  try {
    return CustomerProfileSchema.partial().parse(JSON.parse(raw))
  } catch {
    return {}
  }
}

function defaultsFrom(
  initialData: Partial<CustomerProfileRow> | undefined,
  draft: Partial<CustomerProfileInput>,
): CustomerProfileInput {
  return {
    name: initialData?.name ?? draft.name ?? '',
    company_id: initialData?.company_id ?? draft.company_id ?? '',
    customer_id: initialData?.customer_id ?? draft.customer_id ?? '',
    description: initialData?.description ?? draft.description ?? '',
    buyer_role: initialData?.buyer_role ?? draft.buyer_role ?? '',
    industry: initialData?.industry ?? draft.industry ?? '',
    company_size: initialData?.company_size ?? draft.company_size ?? '',
    pain_points: initialData?.pain_points ?? draft.pain_points ?? '',
    objections: initialData?.objections ?? draft.objections ?? '',
    budget_context: initialData?.budget_context ?? draft.budget_context ?? '',
    decision_authority: initialData?.decision_authority ?? draft.decision_authority ?? '',
    personality_traits: initialData?.personality_traits ?? draft.personality_traits ?? '',
    communication_style: initialData?.communication_style ?? draft.communication_style ?? '',
    product_context: initialData?.product_context ?? draft.product_context ?? '',
    visible_briefing: initialData?.visible_briefing ?? draft.visible_briefing ?? '',
    visit_objective: initialData?.visit_objective ?? draft.visit_objective ?? '',
    success_criteria: initialData?.success_criteria ?? draft.success_criteria ?? '',
    confidential_context: initialData?.confidential_context ?? draft.confidential_context ?? '',
    sales_process_context:
      initialData?.sales_process_context ?? draft.sales_process_context ?? '',
    sales_competencies_context:
      initialData?.sales_competencies_context ?? draft.sales_competencies_context ?? '',
    market_situation: initialData?.market_situation ?? draft.market_situation ?? '',
    competition_context: initialData?.competition_context ?? draft.competition_context ?? '',
    marketing_strategy: initialData?.marketing_strategy ?? draft.marketing_strategy ?? '',
    scenario_type: initialData?.scenario_type ?? draft.scenario_type ?? '',
    difficulty_level: initialData?.difficulty_level ?? draft.difficulty_level,
    behavior_style_id: initialData?.behavior_style_id ?? draft.behavior_style_id,
    chat_model: initialData?.chat_model ?? draft.chat_model ?? null,
    is_active: initialData?.is_active ?? draft.is_active ?? true,
    available_objectives: (initialData?.available_objectives as SessionObjective[] | null) ?? draft.available_objectives ?? null,
    system_prompt: initialData?.system_prompt ?? '',
  }
}

export function useProfileForm({ initialData, action, mode, orgId, profileId }: Options) {
  const [error, setError] = useState<string | null>(null)
  const [suggestingField, setSuggestingField] = useState<keyof CustomerProfileInput | null>(null)
  const [isPending, startTransition] = useTransition()

  const defaultValues = useMemo(
    () => defaultsFrom(initialData, mode === 'create' && !initialData ? readCreateDraft(orgId) : {}),
    [initialData, mode, orgId],
  )

  const form = useForm<CustomerProfileInput>({
    resolver: zodResolver(CustomerProfileSchema),
    defaultValues,
  })

  const values = useWatch({ control: form.control }) as CustomerProfileInput
  const { draftStatus, clearDraft } = useProfileAutoSave({ values, mode, orgId, profileId })

  const completionPercent = useMemo(() => {
    const filled = formFields.filter((field) => {
      const value = values[field]
      return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
    }).length

    return Math.round((filled / formFields.length) * 100)
  }, [values])

  async function suggestField(fieldName: keyof CustomerProfileInput) {
    setSuggestingField(fieldName)
    try {
      const res = await fetch('/api/ai/suggest-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName, currentData: form.getValues() }),
      })

      if (!res.ok) throw new Error('Erro ao sugerir campo.')

      const { suggestion } = (await res.json()) as { suggestion: string }
      form.setValue(fieldName, suggestion as never, { shouldDirty: true, shouldValidate: true })
    } catch {
      setError('Não foi possível gerar sugestão agora.')
    } finally {
      setSuggestingField(null)
    }
  }

  async function suggestFieldFromDoc(fieldName: keyof CustomerProfileInput, file: File) {
    setSuggestingField(fieldName)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const extractRes = await fetch('/api/knowledge/extract-text', { method: 'POST', body: fd })
      if (!extractRes.ok) {
        const body = await extractRes.json() as { error?: string }
        throw new Error(body.error ?? 'Erro ao extrair texto do arquivo.')
      }
      const { text } = (await extractRes.json()) as { text: string }

      const res = await fetch('/api/ai/suggest-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName, currentData: form.getValues(), docText: text }),
      })
      if (!res.ok) throw new Error('Erro ao processar documento.')

      const { suggestion } = (await res.json()) as { suggestion: string }
      form.setValue(fieldName, suggestion as never, { shouldDirty: true, shouldValidate: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível processar o arquivo.')
    } finally {
      setSuggestingField(null)
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void form.handleSubmit((data) => {
      setError(null)
      startTransition(async () => {
        try {
          await action(data)
          clearDraft()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao salvar cenário.')
        }
      })
    })(event)
  }

  return {
    form,
    values,
    onSubmit,
    submitting: isPending,
    error,
    suggestField,
    suggestFieldFromDoc,
    suggestingField,
    draftStatus,
    clearDraft,
    completionPercent,
  }
}

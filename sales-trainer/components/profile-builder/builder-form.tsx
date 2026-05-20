'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CustomerProfileSchema, type CustomerProfileInput } from '@/lib/schemas/profile'
import { PromptPreview } from './prompt-preview'
import type { Database } from '@/types/database'

type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row']

interface Props {
  initialData?: Partial<CustomerProfile>
  action: (data: CustomerProfileInput) => Promise<void>
  submitLabel?: string
}

export function BuilderForm({ initialData, action, submitLabel = 'Salvar' }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestingField, setSuggestingField] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomerProfileInput>({
    resolver: zodResolver(CustomerProfileSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      communication_style: initialData?.communication_style ?? '',
      visible_briefing: initialData?.visible_briefing ?? '',
      budget_context: initialData?.budget_context ?? '',
      objections: initialData?.objections ?? '',
      visit_objective: initialData?.visit_objective ?? '',
      is_active: initialData?.is_active ?? true,
    },
  })

  const watchedValues = watch()

  async function handleSuggest(fieldName: keyof CustomerProfileInput) {
    setSuggestingField(fieldName)
    try {
      const res = await fetch('/api/ai/suggest-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldName,
          currentData: watchedValues,
        }),
      })
      const { suggestion } = (await res.json()) as { suggestion: string }
      setValue(fieldName, suggestion as never)
    } catch {
      // silently fail suggestions
    } finally {
      setSuggestingField(null)
    }
  }

  async function onSubmit(data: CustomerProfileInput) {
    setSubmitting(true)
    setError(null)
    try {
      await action(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex gap-6">
      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-5">
        {error && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {/* Nome */}
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name')}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="Ex: Pedro"
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Descrição */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Descrição</label>
          <input
            {...register('description')}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="Ex: Comprador da rede Alfa"
          />
        </div>

        {/* Estilo de Comportamento */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Estilo de Comportamento</label>
          <select
            {...register('communication_style')}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 bg-white"
          >
            <option value="">Selecione um estilo...</option>
            <option value="Analitico">Analítico</option>
            <option value="Dominante">Dominante</option>
            <option value="Influente">Influente</option>
            <option value="Integrador">Integrador</option>
          </select>
        </div>

        {/* Contexto de Compra */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Contexto de Compra</label>
            <button
              type="button"
              onClick={() => handleSuggest('visible_briefing')}
              disabled={suggestingField === 'visible_briefing'}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {suggestingField === 'visible_briefing' ? 'Sugerindo...' : 'Sugerir ✨'}
            </button>
          </div>
          <textarea
            {...register('visible_briefing')}
            rows={4}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="Descreva o contexto comercial, situação do cliente e o briefing da compra..."
          />
        </div>

        {/* Valor Disponível */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Valor Disponível</label>
            <button
              type="button"
              onClick={() => handleSuggest('budget_context')}
              disabled={suggestingField === 'budget_context'}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {suggestingField === 'budget_context' ? 'Sugerindo...' : 'Sugerir ✨'}
            </button>
          </div>
          <input
            {...register('budget_context')}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="Ex: Orçamento de até R$ 50.000,00 ou verba flexível"
          />
        </div>

        {/* Objeções Típicas */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Objeções Típicas</label>
            <button
              type="button"
              onClick={() => handleSuggest('objections')}
              disabled={suggestingField === 'objections'}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {suggestingField === 'objections' ? 'Sugerindo...' : 'Sugerir ✨'}
            </button>
          </div>
          <textarea
            {...register('objections')}
            rows={3}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="Ex: Acha o preço elevado, prefere concorrente local..."
          />
        </div>

        {/* Objetivo da Visita */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Objetivo da Visita</label>
            <button
              type="button"
              onClick={() => handleSuggest('visit_objective')}
              disabled={suggestingField === 'visit_objective'}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {suggestingField === 'visit_objective' ? 'Sugerindo...' : 'Sugerir ✨'}
            </button>
          </div>
          <textarea
            {...register('visit_objective')}
            rows={3}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="Ex: Entender as reais necessidades, propor demo técnica..."
          />
        </div>

        {/* Ativo */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            {...register('is_active')}
            className="rounded border-neutral-300"
          />
          <label htmlFor="is_active" className="text-sm">
            Perfil ativo (visível para vendedores)
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {submitting ? 'Salvando...' : submitLabel}
        </button>
      </form>

      {/* Preview do prompt */}
      <div className="w-80 shrink-0">
        <PromptPreview values={watchedValues} />
      </div>
    </div>
  )
}

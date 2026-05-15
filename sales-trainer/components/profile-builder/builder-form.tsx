'use client'

import { useState, useEffect } from 'react'
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
      buyer_role: initialData?.buyer_role ?? '',
      industry: initialData?.industry ?? '',
      company_size: initialData?.company_size ?? '',
      pain_points: initialData?.pain_points ?? '',
      objections: initialData?.objections ?? '',
      budget_context: initialData?.budget_context ?? '',
      decision_authority: initialData?.decision_authority ?? '',
      personality_traits: initialData?.personality_traits ?? '',
      communication_style: initialData?.communication_style ?? '',
      product_context: initialData?.product_context ?? '',
      visible_briefing: initialData?.visible_briefing ?? '',
      visit_objective: initialData?.visit_objective ?? '',
      success_criteria: initialData?.success_criteria ?? '',
      confidential_context: initialData?.confidential_context ?? '',
      sales_process_context: initialData?.sales_process_context ?? '',
      sales_competencies_context: initialData?.sales_competencies_context ?? '',
      market_situation: initialData?.market_situation ?? '',
      competition_context: initialData?.competition_context ?? '',
      marketing_strategy: initialData?.marketing_strategy ?? '',
      scenario_type: initialData?.scenario_type as CustomerProfileInput['scenario_type'],
      difficulty_level: initialData?.difficulty_level as CustomerProfileInput['difficulty_level'],
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

  const shortFields = [
    { name: 'buyer_role' as const, label: 'Papel do comprador', placeholder: 'Ex: Diretor Financeiro' },
    { name: 'industry' as const, label: 'Setor / Indústria', placeholder: 'Ex: SaaS B2B' },
    { name: 'company_size' as const, label: 'Tamanho da empresa', placeholder: 'Ex: 100-500 funcionários' },
    { name: 'budget_context' as const, label: 'Contexto de orçamento', placeholder: 'Ex: Orçamento apertado, precisa justificar ROI' },
    { name: 'decision_authority' as const, label: 'Autoridade de decisão', placeholder: 'Ex: Decisor final, mas consulta o CEO' },
  ]

  const longFields = [
    { name: 'visible_briefing' as const, label: 'Briefing visível ao participante', placeholder: 'Informações que o vendedor deve receber antes da visita: contexto do cliente, situação e pontos permitidos.' },
    { name: 'visit_objective' as const, label: 'Objetivo da visita', placeholder: 'Ex: Identificar dores, apresentar proposta e conseguir compromisso para piloto.' },
    { name: 'success_criteria' as const, label: 'Critérios de sucesso', placeholder: 'Liste o que precisa acontecer para o cliente aceitar avançar ou aceitar a proposta.' },
    { name: 'pain_points' as const, label: 'Dores / Problemas', placeholder: 'Descreva os principais problemas que esse comprador enfrenta...' },
    { name: 'objections' as const, label: 'Objeções típicas', placeholder: 'Liste as objeções que esse comprador costuma fazer...' },
    { name: 'personality_traits' as const, label: 'Traços de personalidade', placeholder: 'Ex: Cético, analítico, direto, impaciente com argumentos vagos' },
    { name: 'communication_style' as const, label: 'Estilo de comunicação', placeholder: 'Ex: Formal, faz muitas perguntas, prefere dados a histórias' },
    { name: 'product_context' as const, label: 'O que o vendedor vende', placeholder: 'Ex: Uma plataforma de CRM para equipes de vendas B2B' },
    { name: 'sales_process_context' as const, label: 'Processo de vendas a observar', placeholder: 'Etapas e comportamentos esperados do vendedor. Informação oculta para avaliação.' },
    { name: 'sales_competencies_context' as const, label: 'Competências de vendas avaliadas', placeholder: 'Competências, indicadores e erros esperados. Informação oculta para avaliação.' },
    { name: 'market_situation' as const, label: 'Situação do mercado', placeholder: 'Contexto de mercado que influencia a conversa. Informação de apoio ao avatar.' },
    { name: 'competition_context' as const, label: 'Concorrência', placeholder: 'Concorrentes, alternativas e comparações que o cliente pode levantar.' },
    { name: 'marketing_strategy' as const, label: 'Estratégia de marketing da empresa', placeholder: 'Posicionamento e mensagens estratégicas que a IA pode usar sem revelar como base interna.' },
    { name: 'confidential_context' as const, label: 'Contexto confidencial do avatar', placeholder: 'Informações internas que a IA pode usar para simular, mas nunca deve revelar ao participante.' },
  ]

  const suggestableFields = new Set([
    'visible_briefing', 'visit_objective', 'success_criteria', 'pain_points', 'objections',
    'personality_traits', 'communication_style', 'budget_context', 'decision_authority',
    'sales_process_context', 'sales_competencies_context', 'market_situation',
    'competition_context', 'marketing_strategy',
  ])

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
            Nome do cliente/caso <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name')}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="Ex: Pedro, diretor financeiro da rede Alfa"
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Descrição */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Descrição curta</label>
          <input
            {...register('description')}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="Resumo livre para identificar o perfil rapidamente"
          />
        </div>

        {/* Campos curtos */}
        <div className="grid grid-cols-2 gap-4">
          {shortFields.map(({ name, label, placeholder }) => (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{label}</label>
                {suggestableFields.has(name) && (
                  <button
                    type="button"
                    onClick={() => handleSuggest(name)}
                    disabled={suggestingField === name}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {suggestingField === name ? 'Sugerindo...' : 'Sugerir ✨'}
                  </button>
                )}
              </div>
              <input
                {...register(name)}
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        {/* Campos longos */}
        {longFields.map(({ name, label, placeholder }) => (
          <div key={name} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{label}</label>
              {suggestableFields.has(name) && (
                <button
                  type="button"
                  onClick={() => handleSuggest(name)}
                  disabled={suggestingField === name}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {suggestingField === name ? 'Sugerindo...' : 'Sugerir ✨'}
                </button>
              )}
            </div>
            <textarea
              {...register(name)}
              rows={3}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              placeholder={placeholder}
            />
          </div>
        ))}

        {/* Selects */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Cenário</label>
            <select
              {...register('scenario_type')}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            >
              <option value="">Selecione...</option>
              <option value="discovery">Discovery</option>
              <option value="objection_handling">Tratamento de objeções</option>
              <option value="closing">Fechamento</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Dificuldade</label>
            <select
              {...register('difficulty_level')}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            >
              <option value="">Selecione...</option>
              <option value="easy">Fácil</option>
              <option value="medium">Médio</option>
              <option value="hard">Difícil</option>
            </select>
          </div>
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

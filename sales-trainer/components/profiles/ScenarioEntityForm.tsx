'use client'

import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useFieldArray, useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ProfileFormField } from '@/components/profiles/ProfileFormField'
import {
  ScenarioCompanySchema,
  ScenarioCustomerSchema,
  type ScenarioCompanyInput,
  type ScenarioCustomerInput,
} from '@/lib/schemas/scenario-entities'

type Props =
  | {
      kind: 'company'
      action: (data: ScenarioCompanyInput) => Promise<void>
    }
  | {
      kind: 'customer'
      action: (data: ScenarioCustomerInput) => Promise<void>
    }

const inputClass =
  'w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const textareaClass =
  'w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

export function ScenarioEntityForm(props: Props) {
  return props.kind === 'company' ? (
    <CompanyForm action={props.action} />
  ) : (
    <CustomerForm action={props.action} />
  )
}

function CompanyForm({ action }: { action: (data: ScenarioCompanyInput) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const [suggestingField, setSuggestingField] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()
  const form = useForm<ScenarioCompanyInput>({
    resolver: zodResolver(ScenarioCompanySchema),
    defaultValues: {
      name: '',
      description: '',
      industry: '',
      company_size: '',
      products_services: [{ name: '', description: '' }],
      product_context: '',
      market_situation: '',
      competition_context: '',
      marketing_strategy: '',
      is_active: true,
    },
  })
  const {
    control,
    register,
    setValue,
    getValues,
    formState: { errors },
  } = form
  const products = useFieldArray({ control, name: 'products_services' })
  const values = useWatch({ control })

  async function suggest(fieldName: keyof ScenarioCompanyInput) {
    setSuggestingField(fieldName)
    try {
      const res = await fetch('/api/ai/suggest-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName, currentData: getValues() }),
      })
      if (!res.ok) throw new Error('Erro ao sugerir.')
      const { suggestion } = (await res.json()) as { suggestion: string }
      setValue(fieldName, suggestion as never, { shouldDirty: true, shouldValidate: true })
    } catch {
      setError('Não foi possível gerar sugestão agora.')
    } finally {
      setSuggestingField(null)
    }
  }

  async function suggestProductDescription(index: number) {
    setSuggestingField(`products_services.${index}.description`)
    try {
      const currentData = {
        ...getValues(),
        product_name: getValues(`products_services.${index}.name`),
      }
      const res = await fetch('/api/ai/suggest-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName: 'product_service_description', currentData }),
      })
      if (!res.ok) throw new Error('Erro ao sugerir.')
      const { suggestion } = (await res.json()) as { suggestion: string }
      setValue(`products_services.${index}.description`, suggestion, {
        shouldDirty: true,
        shouldValidate: true,
      })
    } catch {
      setError('Não foi possível gerar sugestão agora.')
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
          await action({
            ...data,
            products_services: data.products_services?.filter(
              (product) => product.name.trim() || product.description.trim(),
            ),
          })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao salvar.')
        }
      })
    })(event)
  }

  return (
    <EntityShell
      title="Dados da empresa"
      description="Crie a base da empresa que poderá ser reutilizada em vários cenários."
      error={error}
      onSubmit={onSubmit}
      submitting={submitting}
      cancelHref="/admin/companies"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <ProfileFormField
          label="Nome"
          required
          description="Nome interno da empresa que aparecerá na seleção de cenário."
          error={errors.name?.message}
        >
          <input {...register('name')} className={inputClass} placeholder="Ex: ACME Tecnologia" />
        </ProfileFormField>
        <ProfileFormField
          label="Descrição"
          description="Resumo curto para ajudar o admin a reconhecer esta empresa."
          error={errors.description?.message}
          suggestable
          suggestLoading={suggestingField === 'description'}
          onSuggest={() => void suggest('description')}
        >
          <input
            {...register('description')}
            className={inputClass}
            placeholder="Ex: SaaS B2B para gestão comercial"
          />
        </ProfileFormField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ProfileFormField
          label="Segmento"
          description="Mercado ou vertical onde a empresa atua."
          error={errors.industry?.message}
        >
          <input {...register('industry')} className={inputClass} placeholder="Ex: tecnologia B2B" />
        </ProfileFormField>
        <ProfileFormField
          label="Porte"
          description="Tamanho, abrangência ou maturidade da operação."
          error={errors.company_size?.message}
        >
          <input
            {...register('company_size')}
            className={inputClass}
            placeholder="Ex: 120 pessoas, atuação nacional"
          />
        </ProfileFormField>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Produtos e serviços</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Cadastre uma ou mais ofertas. Elas ajudam a montar o contexto do cenário.
            </p>
          </div>
          <button
            type="button"
            onClick={() => products.append({ name: '', description: '' })}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
          >
            <Plus className="size-4" />
            Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {products.fields.map((field, index) => (
            <div key={field.id} className="rounded-md border border-neutral-200 bg-white p-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
                <ProfileFormField
                  label="Nome do produto ou serviço"
                  description="Nome comercial da oferta."
                  error={errors.products_services?.[index]?.name?.message}
                >
                  <input
                    {...register(`products_services.${index}.name`)}
                    className={inputClass}
                    placeholder="Ex: Plataforma CRM"
                  />
                </ProfileFormField>
                <ProfileFormField
                  label="Descrição do produto"
                  description="Valor entregue, uso e diferencial principal."
                  error={errors.products_services?.[index]?.description?.message}
                  suggestable
                  suggestLoading={suggestingField === `products_services.${index}.description`}
                  onSuggest={() => void suggestProductDescription(index)}
                >
                  <textarea
                    {...register(`products_services.${index}.description`)}
                    rows={2}
                    className={textareaClass}
                    placeholder="Ex: Centraliza pipeline, automações e relatórios de vendas."
                  />
                </ProfileFormField>
                <button
                  type="button"
                  onClick={() => products.remove(index)}
                  disabled={products.fields.length === 1}
                  className="mt-7 inline-flex size-9 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30"
                  aria-label="Remover produto"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Textarea
        label="Contexto geral da oferta"
        description="Texto livre sobre a oferta principal, caso precise complementar a lista acima."
        register={register('product_context')}
        value={values.product_context}
        error={errors.product_context?.message}
        suggestable
        suggestLoading={suggestingField === 'product_context'}
        onSuggest={() => void suggest('product_context')}
      />
      <Textarea
        label="Mercado"
        description="Pressões, tendências e condições externas que impactam a venda."
        register={register('market_situation')}
        value={values.market_situation}
        error={errors.market_situation?.message}
        suggestable
        suggestLoading={suggestingField === 'market_situation'}
        onSuggest={() => void suggest('market_situation')}
      />
      <Textarea
        label="Concorrência"
        description="Alternativas que o cliente pode comparar durante a negociação."
        register={register('competition_context')}
        value={values.competition_context}
        error={errors.competition_context?.message}
        suggestable
        suggestLoading={suggestingField === 'competition_context'}
        onSuggest={() => void suggest('competition_context')}
      />
      <Textarea
        label="Estratégia comercial"
        description="Posicionamento, argumentos e abordagem comercial esperada."
        register={register('marketing_strategy')}
        value={values.marketing_strategy}
        error={errors.marketing_strategy?.message}
        suggestable
        suggestLoading={suggestingField === 'marketing_strategy'}
        onSuggest={() => void suggest('marketing_strategy')}
      />

      <ActiveCheckbox register={register('is_active')} label="Empresa ativa para novos cenários" />
    </EntityShell>
  )
}

function CustomerForm({ action }: { action: (data: ScenarioCustomerInput) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const [suggestingField, setSuggestingField] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()
  const form = useForm<ScenarioCustomerInput>({
    resolver: zodResolver(ScenarioCustomerSchema),
    defaultValues: {
      name: '',
      description: '',
      buyer_role: '',
      pain_points: '',
      objections: '',
      budget_context: '',
      decision_authority: '',
      personality_traits: '',
      communication_style: '',
      confidential_context: '',
      is_active: true,
    },
  })
  const {
    register,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = form
  const values = useWatch({ control })

  async function suggest(fieldName: keyof ScenarioCustomerInput) {
    setSuggestingField(fieldName)
    try {
      const res = await fetch('/api/ai/suggest-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName, currentData: getValues() }),
      })
      if (!res.ok) throw new Error('Erro ao sugerir.')
      const { suggestion } = (await res.json()) as { suggestion: string }
      setValue(fieldName, suggestion as never, { shouldDirty: true, shouldValidate: true })
    } catch {
      setError('Não foi possível gerar sugestão agora.')
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
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao salvar.')
        }
      })
    })(event)
  }

  return (
    <EntityShell
      title="Dados do cliente"
      description="Crie a persona que poderá ser reutilizada em vários cenários."
      error={error}
      onSubmit={onSubmit}
      submitting={submitting}
      cancelHref="/admin/customers"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <ProfileFormField
          label="Nome"
          required
          description="Nome interno do cliente que aparecerá na seleção de cenário."
          error={errors.name?.message}
        >
          <input {...register('name')} className={inputClass} placeholder="Ex: Carla Menezes" />
        </ProfileFormField>
        <ProfileFormField
          label="Descrição"
          description="Resumo curto para reconhecer a persona."
          error={errors.description?.message}
          suggestable
          suggestLoading={suggestingField === 'description'}
          onSuggest={() => void suggest('description')}
        >
          <input
            {...register('description')}
            className={inputClass}
            placeholder="Ex: decisora cética, orientada a ROI"
          />
        </ProfileFormField>
      </div>

      <ProfileFormField
        label="Cargo ou papel"
        description="Função exercida pelo cliente e responsabilidade na compra."
        error={errors.buyer_role?.message}
      >
        <input {...register('buyer_role')} className={inputClass} placeholder="Ex: CFO" />
      </ProfileFormField>

      <Textarea
        label="Dores"
        description="Problemas e prioridades que o vendedor deve descobrir."
        register={register('pain_points')}
        value={values.pain_points}
        error={errors.pain_points?.message}
        suggestable
        suggestLoading={suggestingField === 'pain_points'}
        onSuggest={() => void suggest('pain_points')}
      />
      <Textarea
        label="Objeções"
        description="Resistências prováveis que a persona trará na conversa."
        register={register('objections')}
        value={values.objections}
        error={errors.objections?.message}
        suggestable
        suggestLoading={suggestingField === 'objections'}
        onSuggest={() => void suggest('objections')}
      />
      <Textarea
        label="Orçamento"
        description="Verba disponível, restrições e critérios financeiros."
        register={register('budget_context')}
        value={values.budget_context}
        error={errors.budget_context?.message}
        suggestable
        suggestLoading={suggestingField === 'budget_context'}
        onSuggest={() => void suggest('budget_context')}
      />
      <Textarea
        label="Autoridade de decisão"
        description="Quem decide, quem influencia e o caminho para aprovação."
        register={register('decision_authority')}
        value={values.decision_authority}
        error={errors.decision_authority?.message}
        suggestable
        suggestLoading={suggestingField === 'decision_authority'}
        onSuggest={() => void suggest('decision_authority')}
      />
      <Textarea
        label="Personalidade"
        description="Traços comportamentais que guiam reação, ritmo e abertura."
        register={register('personality_traits')}
        value={values.personality_traits}
        error={errors.personality_traits?.message}
        suggestable
        suggestLoading={suggestingField === 'personality_traits'}
        onSuggest={() => void suggest('personality_traits')}
      />

      <ProfileFormField
        label="Estilo de comunicação"
        description="Forma preferida de conversar e decidir."
        error={errors.communication_style?.message}
      >
        <select {...register('communication_style')} className={inputClass}>
          <option value="">Selecione...</option>
          <option value="Analitico">Analítico</option>
          <option value="Dominante">Dominante</option>
          <option value="Influente">Influente</option>
          <option value="Integrador">Integrador</option>
          <option value="Estavel">Estável</option>
        </select>
      </ProfileFormField>

      <Textarea
        label="Contexto confidencial"
        description="Informação oculta que o avatar usa, mas não revela espontaneamente."
        register={register('confidential_context')}
        value={values.confidential_context}
        error={errors.confidential_context?.message}
        suggestable
        suggestLoading={suggestingField === 'confidential_context'}
        onSuggest={() => void suggest('confidential_context')}
      />

      <ActiveCheckbox register={register('is_active')} label="Cliente ativo para novos cenários" />
    </EntityShell>
  )
}

function EntityShell({
  title,
  description,
  error,
  onSubmit,
  submitting,
  cancelHref,
  children,
}: {
  title: string
  description: string
  error: string | null
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  submitting: boolean
  cancelHref: string
  children: React.ReactNode
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        </div>
        <div className="space-y-5 p-5">{children}</div>
      </section>
      <div className="sticky bottom-0 z-10 -mx-6 border-t border-neutral-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl justify-end gap-2">
          <Link
            href={cancelHref}
            className="rounded-md px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </form>
  )
}

function Textarea({
  label,
  description,
  register,
  value,
  error,
  suggestable,
  suggestLoading,
  onSuggest,
}: {
  label: string
  description: string
  register: UseFormRegisterReturn
  value?: string
  error?: string
  suggestable?: boolean
  suggestLoading?: boolean
  onSuggest?: () => void
}) {
  return (
    <ProfileFormField
      label={label}
      description={description}
      error={error}
      suggestable={suggestable}
      suggestLoading={suggestLoading}
      onSuggest={onSuggest}
    >
      <textarea {...register} rows={3} className={textareaClass} />
      {value && <p className="text-xs text-neutral-400">{value.length} caracteres</p>}
    </ProfileFormField>
  )
}

function ActiveCheckbox({
  register,
  label,
}: {
  register: UseFormRegisterReturn
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-700">
      <input type="checkbox" {...register} className="size-4 rounded border-neutral-300" />
      {label}
    </label>
  )
}

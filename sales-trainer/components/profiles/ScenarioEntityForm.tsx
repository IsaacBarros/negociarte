'use client'

import Link from 'next/link'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type {
  ScenarioCompanyInput,
  ScenarioCustomerInput,
} from '@/lib/schemas/scenario-entities'
import {
  ScenarioCompanySchema,
  ScenarioCustomerSchema,
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
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const textareaClass =
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

export function ScenarioEntityForm(props: Props) {
  return props.kind === 'company' ? (
    <CompanyForm action={props.action} />
  ) : (
    <CustomerForm action={props.action} />
  )
}

function CompanyForm({ action }: { action: (data: ScenarioCompanyInput) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()
  const form = useForm<ScenarioCompanyInput>({
    resolver: zodResolver(ScenarioCompanySchema),
    defaultValues: {
      name: '',
      description: '',
      industry: '',
      company_size: '',
      product_context: '',
      market_situation: '',
      competition_context: '',
      marketing_strategy: '',
      is_active: true,
    },
  })
  const {
    register,
    formState: { errors },
  } = form

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
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome *</label>
            <input {...register('name')} className={inputClass} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <input {...register('description')} className={inputClass} />
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Segmento</label>
              <input {...register('industry')} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Porte</label>
              <input {...register('company_size')} className={inputClass} />
            </div>
          </div>
          <Textarea label="Produto ou serviço" register={register('product_context')} />
          <Textarea label="Mercado" register={register('market_situation')} />
          <Textarea label="Concorrência" register={register('competition_context')} />
          <Textarea label="Estratégia comercial" register={register('marketing_strategy')} />
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" {...register('is_active')} className="size-4 rounded" />
          Ativo
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Link
          href="/admin/companies"
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
    </form>
  )
}

function CustomerForm({ action }: { action: (data: ScenarioCustomerInput) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
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
    formState: { errors },
  } = form

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
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome *</label>
            <input {...register('name')} className={inputClass} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <input {...register('description')} className={inputClass} />
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cargo ou papel</label>
            <input {...register('buyer_role')} className={inputClass} />
          </div>
          <Textarea label="Dores" register={register('pain_points')} />
          <Textarea label="Objeções" register={register('objections')} />
          <Textarea label="Orçamento" register={register('budget_context')} />
          <Textarea label="Autoridade de decisão" register={register('decision_authority')} />
          <Textarea label="Personalidade" register={register('personality_traits')} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Estilo de comunicação</label>
            <select {...register('communication_style')} className={`${inputClass} bg-white`}>
              <option value="">Selecione...</option>
              <option value="Analitico">Analítico</option>
              <option value="Dominante">Dominante</option>
              <option value="Influente">Influente</option>
              <option value="Integrador">Integrador</option>
              <option value="Estavel">Estável</option>
            </select>
          </div>
          <Textarea label="Contexto confidencial" register={register('confidential_context')} />
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" {...register('is_active')} className="size-4 rounded" />
          Ativo
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Link
          href="/admin/customers"
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
    </form>
  )
}

function Textarea({
  label,
  register,
}: {
  label: string
  register: UseFormRegisterReturn
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <textarea {...register} rows={3} className={textareaClass} />
    </div>
  )
}

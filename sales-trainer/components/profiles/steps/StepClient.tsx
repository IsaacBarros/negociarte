'use client'

import { useEffect, useRef, useState } from 'react'
import { ProfileFormField } from '@/components/profiles/ProfileFormField'
import { ProfileSectionCard } from '@/components/profiles/ProfileSectionCard'
import { QuickCreateDialog } from '@/components/profiles/QuickCreateDialog'
import { createCustomerQuick } from '@/lib/actions/scenario-entities'
import type { StepProps } from './types'

const inputClass =
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const textareaClass =
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

type CustomerItem = NonNullable<StepProps['customers']>[number]

export function StepClient({ form, suggestField, suggestingField, customers = [] }: StepProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const [localCustomers, setLocalCustomers] = useState<CustomerItem[]>(customers)
  const [dialogOpen, setDialogOpen] = useState(false)

  const customerId = watch('customer_id')
  const prevCustomerId = useRef(customerId)

  useEffect(() => {
    if (customerId === prevCustomerId.current) return
    prevCustomerId.current = customerId

    if (!customerId) return
    const customer = localCustomers.find((c) => c.id === customerId)
    if (!customer) return

    if (customer.buyer_role) setValue('buyer_role', customer.buyer_role, { shouldDirty: true })
    if (customer.pain_points) setValue('pain_points', customer.pain_points, { shouldDirty: true })
    if (customer.objections) setValue('objections', customer.objections, { shouldDirty: true })
    if (customer.budget_context) setValue('budget_context', customer.budget_context, { shouldDirty: true })
    if (customer.decision_authority) setValue('decision_authority', customer.decision_authority, { shouldDirty: true })
    if (customer.personality_traits) setValue('personality_traits', customer.personality_traits, { shouldDirty: true })
    if (customer.communication_style) setValue('communication_style', customer.communication_style, { shouldDirty: true })
    if (customer.confidential_context) setValue('confidential_context', customer.confidential_context, { shouldDirty: true })
  }, [customerId, localCustomers, setValue])

  const selectedCustomer = localCustomers.find((c) => c.id === customerId)

  function handleCustomerCreated(entity: { id: string; name: string }) {
    const newCustomer: CustomerItem = {
      id: entity.id,
      name: entity.name,
      description: null,
      buyer_role: null,
      pain_points: null,
      objections: null,
      budget_context: null,
      decision_authority: null,
      personality_traits: null,
      communication_style: null,
      confidential_context: null,
    }
    setLocalCustomers((prev) => [...prev, newCustomer])
    setValue('customer_id', entity.id, { shouldDirty: true })
    setValue('name', entity.name, { shouldDirty: true })
  }

  return (
    <>
      <ProfileSectionCard
        title="Cliente"
        description="Persona simulada: papel, dores, objeções, decisão e comportamento."
      >
        <ProfileFormField
          label="Cliente do cenário"
          required
          error={errors.customer_id?.message}
        >
          <div className="flex gap-2">
            <select
              {...register('customer_id', { setValueAs: (value) => value || undefined })}
              className={`${inputClass} flex-1 bg-white`}
            >
              <option value="">Selecione um cliente...</option>
              {localCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="shrink-0 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
            >
              + Novo cliente
            </button>
          </div>
          {selectedCustomer && (
            <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              <p className="font-medium text-neutral-900">{selectedCustomer.name}</p>
              {selectedCustomer.buyer_role && <p className="mt-1">{selectedCustomer.buyer_role}</p>}
              {selectedCustomer.description && <p className="mt-1">{selectedCustomer.description}</p>}
            </div>
          )}
        </ProfileFormField>

        <div className="grid gap-5 md:grid-cols-2">
          <ProfileFormField
            label="Nome do cliente"
            required
            description="Nome visível do cliente simulado neste cenário."
            error={errors.name?.message}
          >
            <input {...register('name')} className={inputClass} placeholder="Ex: Pedro Almeida" />
          </ProfileFormField>

          <ProfileFormField
            label="Cargo ou papel"
            description="Função que orienta perguntas, autoridade e prioridades do cliente."
            error={errors.buyer_role?.message}
          >
            <input
              {...register('buyer_role')}
              className={inputClass}
              placeholder="Ex: Diretor Comercial"
            />
          </ProfileFormField>
        </div>

        <ProfileFormField
          label="Dores do cliente"
          description="Problemas que o vendedor precisa descobrir ou conectar à oferta."
          error={errors.pain_points?.message}
          suggestable
          suggestLoading={suggestingField === 'pain_points'}
          onSuggest={() => void suggestField('pain_points')}
        >
          <textarea
            {...register('pain_points')}
            rows={3}
            className={textareaClass}
            placeholder="Problemas, frustrações e necessidades que movem a conversa."
          />
        </ProfileFormField>

        <ProfileFormField
          label="Objeções típicas"
          description="Resistências prováveis durante a conversa."
          error={errors.objections?.message}
          suggestable
          suggestLoading={suggestingField === 'objections'}
          onSuggest={() => void suggestField('objections')}
        >
          <textarea
            {...register('objections')}
            rows={3}
            className={textareaClass}
            placeholder="Preço, timing, concorrente, risco, falta de prioridade..."
          />
        </ProfileFormField>

        <details className="group">
          <summary className="cursor-pointer select-none text-sm text-neutral-500 hover:text-neutral-700">
            ▸ Detalhes avançados
          </summary>
          <div className="mt-4 space-y-5">
            <ProfileFormField
              label="Descrição curta"
              description="Resumo para reconhecer este cenário na lista."
              error={errors.description?.message}
            >
              <input
                {...register('description')}
                className={inputClass}
                placeholder="Resumo para identificar este cliente na lista."
              />
            </ProfileFormField>

            <div className="grid gap-5 md:grid-cols-2">
              <ProfileFormField
                label="Orçamento"
                description="Limites de verba, flexibilidade e critérios financeiros."
                error={errors.budget_context?.message}
                suggestable
                suggestLoading={suggestingField === 'budget_context'}
                onSuggest={() => void suggestField('budget_context')}
              >
                <textarea
                  {...register('budget_context')}
                  rows={3}
                  className={textareaClass}
                  placeholder="Verba disponível, restrições e flexibilidade."
                />
              </ProfileFormField>

              <ProfileFormField
                label="Autoridade de decisão"
                description="Quem decide, quem influencia e como a compra avança."
                error={errors.decision_authority?.message}
                suggestable
                suggestLoading={suggestingField === 'decision_authority'}
                onSuggest={() => void suggestField('decision_authority')}
              >
                <textarea
                  {...register('decision_authority')}
                  rows={3}
                  className={textareaClass}
                  placeholder="Quem decide, quem influencia e qual processo interno existe."
                />
              </ProfileFormField>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <ProfileFormField
                label="Traços de personalidade"
                description="Comportamento natural do cliente durante a simulação."
                error={errors.personality_traits?.message}
                suggestable
                suggestLoading={suggestingField === 'personality_traits'}
                onSuggest={() => void suggestField('personality_traits')}
              >
                <textarea
                  {...register('personality_traits')}
                  rows={3}
                  className={textareaClass}
                  placeholder="Cético, objetivo, colaborativo, analítico..."
                />
              </ProfileFormField>

              <ProfileFormField
                label="Estilo de comunicação"
                description="Como o cliente tende a falar, reagir e tomar decisões."
                error={errors.communication_style?.message}
              >
                <select {...register('communication_style')} className={`${inputClass} bg-white`}>
                  <option value="">Selecione...</option>
                  <option value="Analitico">Analítico</option>
                  <option value="Dominante">Dominante</option>
                  <option value="Influente">Influente</option>
                  <option value="Integrador">Integrador</option>
                  <option value="Estavel">Estável</option>
                </select>
              </ProfileFormField>
            </div>
          </div>
        </details>
      </ProfileSectionCard>

      <QuickCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Novo cliente"
        submitLabel="Criar cliente"
        action={(data) => createCustomerQuick(data)}
        onSuccess={handleCustomerCreated}
        fields={[
          { name: 'name', label: 'Nome do cliente', placeholder: 'Ex: Pedro Almeida', required: true },
          { name: 'buyer_role', label: 'Cargo ou papel', placeholder: 'Ex: Diretor Comercial' },
          { name: 'description', label: 'Descrição curta', placeholder: 'Ex: Decisor técnico, cético a novas tecnologias' },
        ]}
      />
    </>
  )
}

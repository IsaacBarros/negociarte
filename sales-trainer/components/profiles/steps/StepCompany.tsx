'use client'

import { useEffect, useRef, useState } from 'react'
import { ProfileFormField } from '@/components/profiles/ProfileFormField'
import { ProfileSectionCard } from '@/components/profiles/ProfileSectionCard'
import { QuickCreateDialog } from '@/components/profiles/QuickCreateDialog'
import { createCompanyQuick } from '@/lib/actions/scenario-entities'
import type { StepProps } from './types'

const inputClass =
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const textareaClass =
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

type CompanyItem = NonNullable<StepProps['companies']>[number]

export function StepCompany({ form, suggestField, suggestingField, companies = [] }: StepProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const [localCompanies, setLocalCompanies] = useState<CompanyItem[]>(companies)
  const [dialogOpen, setDialogOpen] = useState(false)

  const companyId = watch('company_id')
  const prevCompanyId = useRef(companyId)

  useEffect(() => {
    if (companyId === prevCompanyId.current) return
    prevCompanyId.current = companyId

    if (!companyId) return
    const company = localCompanies.find((c) => c.id === companyId)
    if (!company) return

    if (company.industry) setValue('industry', company.industry, { shouldDirty: true })
    if (company.company_size) setValue('company_size', company.company_size, { shouldDirty: true })
    if (company.product_context) setValue('product_context', company.product_context, { shouldDirty: true })
    if (company.market_situation) setValue('market_situation', company.market_situation, { shouldDirty: true })
    if (company.competition_context) setValue('competition_context', company.competition_context, { shouldDirty: true })
    if (company.marketing_strategy) setValue('marketing_strategy', company.marketing_strategy, { shouldDirty: true })
  }, [companyId, localCompanies, setValue])

  const selectedCompany = localCompanies.find((c) => c.id === companyId)

  function handleCompanyCreated(entity: { id: string; name: string }) {
    const newCompany: CompanyItem = {
      id: entity.id,
      name: entity.name,
      description: null,
      industry: null,
      company_size: null,
      product_context: null,
      market_situation: null,
      competition_context: null,
      marketing_strategy: null,
    }
    setLocalCompanies((prev) => [...prev, newCompany])
    setValue('company_id', entity.id, { shouldDirty: true })
  }

  return (
    <>
      <ProfileSectionCard
        title="Empresa"
        description="Contexto da empresa, oferta e ambiente competitivo usados no cenário."
      >
        <ProfileFormField
          label="Empresa do cenário"
          required
          error={errors.company_id?.message}
        >
          <div className="flex gap-2">
            <select
              {...register('company_id', { setValueAs: (value) => value || undefined })}
              className={`${inputClass} flex-1 bg-white`}
            >
              <option value="">Selecione uma empresa...</option>
              {localCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="shrink-0 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
            >
              + Nova empresa
            </button>
          </div>
          {selectedCompany && (
            <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              <p className="font-medium text-neutral-900">{selectedCompany.name}</p>
              {selectedCompany.description && <p className="mt-1">{selectedCompany.description}</p>}
            </div>
          )}
        </ProfileFormField>

        <details className="group">
          <summary className="cursor-pointer select-none text-sm text-neutral-500 hover:text-neutral-700">
            ▸ Detalhes avançados
          </summary>
          <div className="mt-4 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <ProfileFormField
                label="Segmento"
                description="Área de atuação da empresa usada na simulação."
                error={errors.industry?.message}
              >
                <input
                  {...register('industry')}
                  className={inputClass}
                  placeholder="Ex: SaaS B2B, varejo, indústria farmacêutica"
                />
              </ProfileFormField>

              <ProfileFormField
                label="Porte da empresa"
                description="Tamanho e abrangência da operação."
                error={errors.company_size?.message}
              >
                <input
                  {...register('company_size')}
                  className={inputClass}
                  placeholder="Ex: 200 colaboradores, operação nacional"
                />
              </ProfileFormField>
            </div>

            <ProfileFormField
              label="Produto ou serviço"
              description="Oferta principal que o vendedor levará para a conversa."
              error={errors.product_context?.message}
              suggestable
              suggestLoading={suggestingField === 'product_context'}
              onSuggest={() => void suggestField('product_context')}
            >
              <textarea
                {...register('product_context')}
                rows={3}
                className={textareaClass}
                placeholder="O que o vendedor está tentando vender e qual valor a oferta promete."
              />
            </ProfileFormField>

            <ProfileFormField
              label="Situação de mercado"
              description="Condições externas que influenciam a negociação."
              error={errors.market_situation?.message}
              suggestable
              suggestLoading={suggestingField === 'market_situation'}
              onSuggest={() => void suggestField('market_situation')}
            >
              <textarea
                {...register('market_situation')}
                rows={3}
                className={textareaClass}
                placeholder="Momento do mercado, pressão externa, tendências e riscos."
              />
            </ProfileFormField>

            <ProfileFormField
              label="Concorrência"
              description="Alternativas e pressões competitivas que o cliente pode citar."
              error={errors.competition_context?.message}
              suggestable
              suggestLoading={suggestingField === 'competition_context'}
              onSuggest={() => void suggestField('competition_context')}
            >
              <textarea
                {...register('competition_context')}
                rows={3}
                className={textareaClass}
                placeholder="Alternativas que o cliente considera e como a empresa se compara."
              />
            </ProfileFormField>

            <ProfileFormField
              label="Estratégia comercial e marketing"
              description="Posicionamento e argumentos que a empresa quer testar no treino."
              error={errors.marketing_strategy?.message}
              suggestable
              suggestLoading={suggestingField === 'marketing_strategy'}
              onSuggest={() => void suggestField('marketing_strategy')}
            >
              <textarea
                {...register('marketing_strategy')}
                rows={3}
                className={textareaClass}
                placeholder="Posicionamento, diferenciais, mensagens-chave e abordagem esperada."
              />
            </ProfileFormField>
          </div>
        </details>
      </ProfileSectionCard>

      <QuickCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Nova empresa"
        submitLabel="Criar empresa"
        action={(data) => createCompanyQuick(data)}
        onSuccess={handleCompanyCreated}
        fields={[
          { name: 'name', label: 'Nome da empresa', placeholder: 'Ex: Acme Ltda', required: true },
          { name: 'industry', label: 'Setor', placeholder: 'Ex: SaaS B2B, varejo' },
          { name: 'company_size', label: 'Porte', placeholder: 'Ex: 200 colaboradores' },
        ]}
      />
    </>
  )
}

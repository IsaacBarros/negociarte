'use client'

import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { ProfileFormField } from '@/components/profiles/ProfileFormField'
import { ProfileSectionCard } from '@/components/profiles/ProfileSectionCard'
import { SELECTABLE_CHAT_MODELS } from '@/lib/ai/models'
import { SESSION_OBJECTIVES, SESSION_OBJECTIVE_LABELS, type SessionObjective } from '@/lib/schemas/session'
import type { StepProps } from './types'

const inputClass =
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const textareaClass =
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

export function StepBriefing({ form, suggestField, suggestFieldFromDoc, suggestingField }: StepProps) {
  const {
    register,
    formState: { errors },
  } = form

  const [customInput, setCustomInput] = useState('')

  return (
    <div className="space-y-5">
      {/* Identificação */}
      <ProfileSectionCard
        title="Cenário"
        description="Nome, tipo e configurações que identificam este cenário."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <ProfileFormField
            label="Nome do cenário"
            required
            description="Nome visível do cenário e do cliente simulado."
            error={errors.name?.message}
          >
            <input {...register('name')} className={inputClass} placeholder="Ex: Pedro Almeida — Clínica Vida Pet" />
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

        <div className="grid gap-5 md:grid-cols-2">
          <ProfileFormField
            label="Tipo de cenário"
            description="Define o foco principal da conversa de treino."
            error={errors.scenario_type?.message}
          >
            <select {...register('scenario_type')} className={`${inputClass} bg-white`}>
              <option value="">Selecione...</option>
              <option value="discovery">Descoberta</option>
              <option value="objection_handling">Tratamento de objeções</option>
              <option value="closing">Fechamento</option>
            </select>
          </ProfileFormField>

          <ProfileFormField
            label="Dificuldade"
            description="Ajusta resistência inicial, nível de objeção e rigor da conversa."
            error={errors.difficulty_level?.message}
          >
            <select
              {...register('difficulty_level', { setValueAs: (value) => value || undefined })}
              className={`${inputClass} bg-white`}
            >
              <option value="">Selecione...</option>
              <option value="easy">Fácil</option>
              <option value="medium">Médio</option>
              <option value="hard">Difícil</option>
              <option value="trainee_choice">Escolha do vendedor</option>
            </select>
          </ProfileFormField>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            {...register('is_active')}
            className="size-4 rounded border-neutral-300"
          />
          Cenário ativo para vendedores
        </label>
      </ProfileSectionCard>

      {/* Briefing visível */}
      <ProfileSectionCard
        title="Briefing"
        description="O que o vendedor vê antes de iniciar a visita."
      >
        <ProfileFormField
          label="Briefing visível ao vendedor"
          description="Informação que o participante verá antes de iniciar a visita."
          error={errors.visible_briefing?.message}
          suggestable
          suggestLoading={suggestingField === 'visible_briefing'}
          onSuggest={() => void suggestField('visible_briefing')}
          onUploadSuggest={(file) => void suggestFieldFromDoc('visible_briefing', file)}
        >
          <textarea
            {...register('visible_briefing')}
            rows={4}
            className={textareaClass}
          />
        </ProfileFormField>

        <ProfileFormField
          label="Objetivo da visita"
          description="Resultado esperado para considerar a visita bem conduzida."
          error={errors.visit_objective?.message}
          suggestable
          suggestLoading={suggestingField === 'visit_objective'}
          onSuggest={() => void suggestField('visit_objective')}
          onUploadSuggest={(file) => void suggestFieldFromDoc('visit_objective', file)}
        >
          <textarea
            {...register('visit_objective')}
            rows={3}
            className={textareaClass}
          />
        </ProfileFormField>

        <ProfileFormField
          label="Critérios de sucesso"
          description="O que será observado para avaliar a qualidade da condução."
          error={errors.success_criteria?.message}
          suggestable
          suggestLoading={suggestingField === 'success_criteria'}
          onSuggest={() => void suggestField('success_criteria')}
          onUploadSuggest={(file) => void suggestFieldFromDoc('success_criteria', file)}
        >
          <textarea
            {...register('success_criteria')}
            rows={3}
            className={textareaClass}
          />
        </ProfileFormField>
      </ProfileSectionCard>

      {/* Objetivos disponíveis */}
      <ProfileSectionCard
        title="Objetivos disponíveis"
        description="Selecione quais objetivos padrão o vendedor pode escolher e adicione objetivos personalizados para este cenário."
      >
        <Controller
          control={form.control}
          name="available_objectives"
          render={({ field }) => {
            const allValues = (field.value as string[] | null | undefined) ?? [...SESSION_OBJECTIVES]
            const predefinedChecked = allValues.filter((o): o is SessionObjective =>
              SESSION_OBJECTIVES.includes(o as SessionObjective),
            )
            const customItems = allValues.filter(
              (o) => !SESSION_OBJECTIVES.includes(o as SessionObjective),
            )

            function buildNext(predefined: SessionObjective[], custom: string[]): string[] | null {
              const combined = [...predefined, ...custom]
              if (custom.length === 0 && predefined.length === SESSION_OBJECTIVES.length) return null
              return combined
            }

            function toggle(obj: SessionObjective) {
              const next = predefinedChecked.includes(obj)
                ? predefinedChecked.filter((o) => o !== obj)
                : [...predefinedChecked, obj]
              field.onChange(buildNext(next, customItems))
            }

            function addCustom() {
              const trimmed = customInput.trim()
              if (!trimmed || customItems.includes(trimmed)) return
              const next = buildNext(predefinedChecked, [...customItems, trimmed])
              field.onChange(next ?? [...SESSION_OBJECTIVES, trimmed])
              setCustomInput('')
            }

            function removeCustom(item: string) {
              field.onChange(buildNext(predefinedChecked, customItems.filter((c) => c !== item)))
            }

            return (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {SESSION_OBJECTIVES.map((obj) => (
                    <label key={obj} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={predefinedChecked.includes(obj)}
                        onChange={() => toggle(obj)}
                        className="size-4 rounded border-neutral-300"
                      />
                      {SESSION_OBJECTIVE_LABELS[obj]}
                    </label>
                  ))}
                </div>

                {customItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customItems.map((item) => (
                      <span
                        key={item}
                        className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeCustom(item)}
                          className="text-neutral-400 hover:text-red-500"
                          aria-label={`Remover ${item}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                    placeholder="Novo objetivo personalizado..."
                    className="flex-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCustom}
                    disabled={!customInput.trim()}
                    className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                  >
                    <Plus className="size-3.5" />
                    Adicionar
                  </button>
                </div>

                <p className="text-xs text-neutral-400">
                  Objetivos padrão todos marcados + sem personalizados = comportamento padrão (todos disponíveis).
                </p>
              </div>
            )
          }}
        />
      </ProfileSectionCard>

      {/* Base interna */}
      <ProfileSectionCard
        title="Base interna"
        description="Informações usadas pela simulação e avaliação. O participante não vê este conteúdo."
      >
        <ProfileFormField
          label="Dores do cliente"
          description="Problemas que o vendedor precisa descobrir ou conectar à oferta."
          error={errors.pain_points?.message}
          suggestable
          suggestLoading={suggestingField === 'pain_points'}
          onSuggest={() => void suggestField('pain_points')}
          onUploadSuggest={(file) => void suggestFieldFromDoc('pain_points', file)}
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
          onUploadSuggest={(file) => void suggestFieldFromDoc('objections', file)}
        >
          <textarea
            {...register('objections')}
            rows={3}
            className={textareaClass}
            placeholder="Preço, timing, concorrente, risco, falta de prioridade..."
          />
        </ProfileFormField>

        <ProfileFormField
          label="Contexto confidencial"
          description="Informação oculta usada pelo avatar. Não aparece para o vendedor."
          error={errors.confidential_context?.message}
          suggestable
          suggestLoading={suggestingField === 'confidential_context'}
          onSuggest={() => void suggestField('confidential_context')}
          onUploadSuggest={(file) => void suggestFieldFromDoc('confidential_context', file)}
        >
          <textarea
            {...register('confidential_context')}
            rows={3}
            className={textareaClass}
          />
        </ProfileFormField>

        <ProfileFormField
          label="Processo de vendas esperado"
          description="Etapas e comportamentos que a simulação deve valorizar."
          error={errors.sales_process_context?.message}
          suggestable
          suggestLoading={suggestingField === 'sales_process_context'}
          onSuggest={() => void suggestField('sales_process_context')}
          onUploadSuggest={(file) => void suggestFieldFromDoc('sales_process_context', file)}
        >
          <textarea
            {...register('sales_process_context')}
            rows={3}
            className={textareaClass}
          />
        </ProfileFormField>

        <ProfileFormField
          label="Competências avaliadas"
          description="Habilidades que devem ser consideradas na avaliação final."
          error={errors.sales_competencies_context?.message}
          suggestable
          suggestLoading={suggestingField === 'sales_competencies_context'}
          onSuggest={() => void suggestField('sales_competencies_context')}
          onUploadSuggest={(file) => void suggestFieldFromDoc('sales_competencies_context', file)}
        >
          <textarea
            {...register('sales_competencies_context')}
            rows={3}
            className={textareaClass}
          />
        </ProfileFormField>
      </ProfileSectionCard>

      {/* Overrides avançados */}
      <details className="group rounded-lg border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer select-none text-sm font-medium text-neutral-700 hover:text-neutral-900">
          ▸ Contexto da empresa (override)
        </summary>
        <div className="mt-4 space-y-5">
          <p className="text-xs text-neutral-500">
            Campos opcionais para sobrescrever o contexto padrão do projeto neste cenário específico.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <ProfileFormField
              label="Segmento"
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
            error={errors.product_context?.message}
            suggestable
            suggestLoading={suggestingField === 'product_context'}
            onSuggest={() => void suggestField('product_context')}
            onUploadSuggest={(file) => void suggestFieldFromDoc('product_context', file)}
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
            error={errors.market_situation?.message}
            suggestable
            suggestLoading={suggestingField === 'market_situation'}
            onSuggest={() => void suggestField('market_situation')}
            onUploadSuggest={(file) => void suggestFieldFromDoc('market_situation', file)}
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
            error={errors.competition_context?.message}
            suggestable
            suggestLoading={suggestingField === 'competition_context'}
            onSuggest={() => void suggestField('competition_context')}
            onUploadSuggest={(file) => void suggestFieldFromDoc('competition_context', file)}
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
            error={errors.marketing_strategy?.message}
            suggestable
            suggestLoading={suggestingField === 'marketing_strategy'}
            onSuggest={() => void suggestField('marketing_strategy')}
            onUploadSuggest={(file) => void suggestFieldFromDoc('marketing_strategy', file)}
          >
            <textarea
              {...register('marketing_strategy')}
              rows={3}
              className={textareaClass}
              placeholder="Posicionamento, diferenciais, mensagens-chave e abordagem esperada."
            />
          </ProfileFormField>

          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-600 select-none">
              Configurações avançadas
            </summary>
            <div className="mt-3 space-y-3">
              <ProfileFormField
                label="Modelo de IA"
                description="LLM que interpretará o cliente neste cenário. O padrão usa a configuração global."
                error={errors.chat_model?.message}
              >
                <select
                  {...register('chat_model', { setValueAs: (value) => value || null })}
                  className={`${inputClass} bg-white`}
                >
                  {SELECTABLE_CHAT_MODELS.map((model) => (
                    <option key={model.modelId ?? '__default__'} value={model.modelId ?? ''}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </ProfileFormField>

              <ProfileFormField
                label="Descrição curta"
                description="Resumo para reconhecer este cenário na lista."
                error={errors.description?.message}
              >
                <input
                  {...register('description')}
                  className={inputClass}
                  placeholder="Resumo para identificar este cenário na lista."
                />
              </ProfileFormField>

              <div className="grid gap-5 md:grid-cols-2">
                <ProfileFormField
                  label="Orçamento"
                  error={errors.budget_context?.message}
                  suggestable
                  suggestLoading={suggestingField === 'budget_context'}
                  onSuggest={() => void suggestField('budget_context')}
                  onUploadSuggest={(file) => void suggestFieldFromDoc('budget_context', file)}
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
                  error={errors.decision_authority?.message}
                  suggestable
                  suggestLoading={suggestingField === 'decision_authority'}
                  onSuggest={() => void suggestField('decision_authority')}
                  onUploadSuggest={(file) => void suggestFieldFromDoc('decision_authority', file)}
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
                  error={errors.personality_traits?.message}
                  suggestable
                  suggestLoading={suggestingField === 'personality_traits'}
                  onSuggest={() => void suggestField('personality_traits')}
                  onUploadSuggest={(file) => void suggestFieldFromDoc('personality_traits', file)}
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
        </div>
      </details>
    </div>
  )
}

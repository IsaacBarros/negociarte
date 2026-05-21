'use client'

import { ProfileFormField } from '@/components/profiles/ProfileFormField'
import { ProfileSectionCard } from '@/components/profiles/ProfileSectionCard'
import { SELECTABLE_CHAT_MODELS } from '@/lib/ai/models'
import type { StepProps } from './types'

const inputClass =
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const textareaClass =
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

export function StepScenario({ form, suggestField, suggestingField, behaviorStyles = [] }: StepProps) {
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="space-y-5">
      <ProfileSectionCard
        title="Cenário"
        description="O cenário junta a empresa e o cliente em uma visita comercial treinável."
      >
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

        {behaviorStyles.length > 0 && (
          <ProfileFormField
            label="Estilo de comportamento fixo"
            description="Se selecionado, este estilo será sempre usado neste cenário. Deixe em branco para seleção aleatória."
            error={errors.behavior_style_id?.message}
          >
            <select
              {...register('behavior_style_id', { setValueAs: (value) => value || undefined })}
              className={`${inputClass} bg-white`}
            >
              <option value="">Aleatório (padrão)</option>
              {behaviorStyles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
          </ProfileFormField>
        )}

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
          label="Briefing visível ao vendedor"
          description="Informação que o participante verá antes de iniciar a visita."
          error={errors.visible_briefing?.message}
          suggestable
          suggestLoading={suggestingField === 'visible_briefing'}
          onSuggest={() => void suggestField('visible_briefing')}
        >
          <textarea
            {...register('visible_briefing')}
            rows={4}
            className={textareaClass}
            placeholder="O que o vendedor sabe antes de iniciar a simulação."
          />
        </ProfileFormField>

        <ProfileFormField
          label="Objetivo da visita"
          description="Resultado esperado para considerar a visita bem conduzida."
          error={errors.visit_objective?.message}
          suggestable
          suggestLoading={suggestingField === 'visit_objective'}
          onSuggest={() => void suggestField('visit_objective')}
        >
          <textarea
            {...register('visit_objective')}
            rows={3}
            className={textareaClass}
            placeholder="Resultado esperado: diagnóstico, demo, proposta, próximo passo..."
          />
        </ProfileFormField>

        <ProfileFormField
          label="Critérios de sucesso"
          description="O que será observado para avaliar a qualidade da condução."
          error={errors.success_criteria?.message}
          suggestable
          suggestLoading={suggestingField === 'success_criteria'}
          onSuggest={() => void suggestField('success_criteria')}
        >
          <textarea
            {...register('success_criteria')}
            rows={3}
            className={textareaClass}
            placeholder="Como saber se o vendedor conduziu bem a visita."
          />
        </ProfileFormField>
      </ProfileSectionCard>

      <ProfileSectionCard
        title="Base interna"
        description="Informações usadas pela simulação e avaliação. O participante não vê este conteúdo."
      >
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Briefing visível aparece para o vendedor. Base interna orienta o avatar e a avaliação,
          mas não deve ser revelada durante a conversa.
        </div>

        <ProfileFormField
          label="Contexto confidencial"
          description="Informação oculta usada pelo avatar. Não aparece para o vendedor."
          error={errors.confidential_context?.message}
          suggestable
          suggestLoading={suggestingField === 'confidential_context'}
          onSuggest={() => void suggestField('confidential_context')}
        >
          <textarea
            {...register('confidential_context')}
            rows={3}
            className={textareaClass}
            placeholder="Informações ocultas do cliente, limites reais, política interna, riscos."
          />
        </ProfileFormField>

        <ProfileFormField
          label="Processo de vendas esperado"
          description="Etapas e comportamentos que a simulação deve valorizar."
          error={errors.sales_process_context?.message}
          suggestable
          suggestLoading={suggestingField === 'sales_process_context'}
          onSuggest={() => void suggestField('sales_process_context')}
        >
          <textarea
            {...register('sales_process_context')}
            rows={3}
            className={textareaClass}
            placeholder="Etapas, perguntas e condução esperada do vendedor."
          />
        </ProfileFormField>

        <ProfileFormField
          label="Competências avaliadas"
          description="Habilidades que devem ser consideradas na avaliação final."
          error={errors.sales_competencies_context?.message}
          suggestable
          suggestLoading={suggestingField === 'sales_competencies_context'}
          onSuggest={() => void suggestField('sales_competencies_context')}
        >
          <textarea
            {...register('sales_competencies_context')}
            rows={3}
            className={textareaClass}
            placeholder="Descoberta, escuta, argumentação, negociação, fechamento..."
          />
        </ProfileFormField>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            {...register('is_active')}
            className="size-4 rounded border-neutral-300"
          />
          Cenário ativo para vendedores
        </label>
      </ProfileSectionCard>
    </div>
  )
}

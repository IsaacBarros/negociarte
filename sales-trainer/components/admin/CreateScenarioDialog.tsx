'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { createCustomerQuick, createProfileQuick } from '@/lib/actions/scenario-entities'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  companyId: string
  projectProductContext?: string | null
}

type State = 'idle' | 'working' | 'done' | 'error'

const SCENARIO_TYPES = [
  { value: 'discovery', label: 'Descoberta' },
  { value: 'objection_handling', label: 'Contorno de objeções' },
  { value: 'closing', label: 'Fechamento' },
] as const

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Médio' },
  { value: 'hard', label: 'Difícil' },
  { value: 'trainee_choice', label: 'Aluno escolhe' },
] as const

type ScenarioType = (typeof SCENARIO_TYPES)[number]['value']
type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number]['value']

interface GeneratedData {
  customer: {
    name: string
    buyer_role: string
    description: string
    pain_points: string
    objections: string
    budget_context: string
    decision_authority: string
    personality_traits: string
    communication_style: string
  }
  profile: {
    name: string
    industry: string
    company_size: string
    market_situation: string
    competition_context: string
    visible_briefing: string
    visit_objective: string
    success_criteria: string
    confidential_context: string
    sales_process_context: string
    sales_competencies_context: string
  }
}

export function CreateScenarioDialog({ open, onOpenChange, companyId, projectProductContext }: Props) {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [workingMsg, setWorkingMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [prospectCompanyName, setProspectCompanyName] = useState('')
  const [extraContext, setExtraContext] = useState('')
  const [hasPriorContact, setHasPriorContact] = useState(false)
  const [relationshipHistory, setRelationshipHistory] = useState('')
  const [scenarioType, setScenarioType] = useState<ScenarioType>('discovery')
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('medium')

  function reset() {
    setState('idle')
    setWorkingMsg('')
    setErrorMsg(null)
    setContactName('')
    setContactRole('')
    setProspectCompanyName('')
    setExtraContext('')
    setHasPriorContact(false)
    setRelationshipHistory('')
    setScenarioType('discovery')
    setDifficultyLevel('medium')
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(reset, 300)
  }

  useEffect(() => {
    if (!open) setTimeout(reset, 300)
  }, [open])

  const canGenerate =
    contactName.trim().length > 0 &&
    contactRole.trim().length > 0 &&
    prospectCompanyName.trim().length > 0

  async function handleGenerate() {
    setState('working')
    setWorkingMsg('Gerando cenário com IA…')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/ai/generate-scenario-from-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          contact_name: contactName.trim(),
          contact_role: contactRole.trim(),
          prospect_company_name: prospectCompanyName.trim(),
          prospect_company_description: extraContext.trim() || undefined,
          relationship_history: hasPriorContact ? relationshipHistory.trim() || undefined : undefined,
          scenario_type: scenarioType,
          difficulty_level: difficultyLevel,
        }),
      })

      const json: unknown = await res.json()

      if (!res.ok) {
        setState('error')
        setErrorMsg((json as { error?: string }).error ?? 'Erro na geração.')
        return
      }

      const { data } = json as { data: GeneratedData }

      setWorkingMsg('Salvando cenário…')

      const createdCustomer = await createCustomerQuick({
        name: data.customer.name,
        buyer_role: data.customer.buyer_role,
        description: `${prospectCompanyName} — ${data.customer.description}`,
        pain_points: data.customer.pain_points,
        objections: data.customer.objections,
        budget_context: data.customer.budget_context,
        decision_authority: data.customer.decision_authority,
        personality_traits: data.customer.personality_traits,
        communication_style: data.customer.communication_style,
      })

      await createProfileQuick({
        company_id: companyId,
        customer_id: createdCustomer.id,
        name: data.profile.name,
        buyer_role: data.customer.buyer_role,
        industry: data.profile.industry,
        company_size: data.profile.company_size,
        pain_points: data.customer.pain_points,
        objections: data.customer.objections,
        budget_context: data.customer.budget_context,
        decision_authority: data.customer.decision_authority,
        personality_traits: data.customer.personality_traits,
        communication_style: data.customer.communication_style,
        product_context: projectProductContext ?? undefined,
        market_situation: data.profile.market_situation,
        competition_context: data.profile.competition_context,
        marketing_strategy: undefined,
        visible_briefing: data.profile.visible_briefing,
        visit_objective: data.profile.visit_objective,
        success_criteria: data.profile.success_criteria,
        confidential_context: data.profile.confidential_context,
        sales_process_context: data.profile.sales_process_context,
        sales_competencies_context: data.profile.sales_competencies_context,
        scenario_type: scenarioType,
        difficulty_level: difficultyLevel,
        is_active: true,
      })

      setState('done')
      router.refresh()
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-600" />
            Novo cenário
          </DialogTitle>
          <DialogDescription>
            {state === 'done'
              ? 'Cenário criado com sucesso!'
              : 'Informe o contato e a IA monta o cenário usando a base de conhecimento.'}
          </DialogDescription>
        </DialogHeader>

        {/* done */}
        {state === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="size-12 text-green-500" />
            <p className="text-sm text-neutral-600">O cenário aparece na lista de cenários.</p>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Fechar
            </button>
          </div>
        )}

        {/* error */}
        {state === 'error' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2 text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p className="text-sm">{errorMsg}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setState('idle')}
              className="text-sm text-neutral-600 underline hover:no-underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* working */}
        {state === 'working' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="size-10 animate-spin text-violet-600" />
            <p className="text-sm text-neutral-500">{workingMsg}</p>
          </div>
        )}

        {/* form */}
        {state === 'idle' && (
          <div className="mt-2 space-y-4">
            {/* Identificação */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Nome do contato <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="João Mendes"
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Cargo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder="CFO"
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Empresa <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={prospectCompanyName}
                onChange={(e) => setProspectCompanyName(e.target.value)}
                placeholder="TechCorp Distribuidora"
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Contexto adicional
                <span className="ml-1 font-normal text-neutral-400">(opcional)</span>
              </label>
              <textarea
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Algo específico desta empresa que não está nos documentos?"
                className="w-full resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>

            {/* Histórico */}
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-600">
                Histórico de relacionamento
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasPriorContact(false)}
                  className={[
                    'rounded-md border px-3 py-1.5 text-xs transition-colors',
                    !hasPriorContact
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
                  ].join(' ')}
                >
                  Primeiro contato
                </button>
                <button
                  type="button"
                  onClick={() => setHasPriorContact(true)}
                  className={[
                    'rounded-md border px-3 py-1.5 text-xs transition-colors',
                    hasPriorContact
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
                  ].join(' ')}
                >
                  Já tive contato
                </button>
              </div>
              {hasPriorContact && (
                <textarea
                  value={relationshipHistory}
                  onChange={(e) => setRelationshipHistory(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Como foi o contato anterior? O que ficou pendente?"
                  className="mt-2 w-full resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              )}
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-4">
              {/* Tipo */}
              <div>
                <label className="mb-2 block text-xs font-medium text-neutral-600">Tipo</label>
                <div className="flex flex-wrap gap-2">
                  {SCENARIO_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setScenarioType(t.value)}
                      className={[
                        'rounded-md border px-3 py-1.5 text-sm transition-colors',
                        scenarioType === t.value
                          ? 'border-violet-600 bg-violet-50 text-violet-700'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
                      ].join(' ')}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dificuldade */}
              <div>
                <label className="mb-2 block text-xs font-medium text-neutral-600">Dificuldade</label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTY_LEVELS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDifficultyLevel(d.value)}
                      className={[
                        'rounded-md border px-3 py-1.5 text-sm transition-colors',
                        difficultyLevel === d.value
                          ? 'border-violet-600 bg-violet-50 text-violet-700'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
                      ].join(' ')}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
              <p className="text-xs text-neutral-400">
                Base de conhecimento usada automaticamente.
              </p>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
              >
                <Sparkles className="size-4" />
                Gerar cenário
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

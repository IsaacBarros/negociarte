'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { createProfileQuick } from '@/lib/actions/scenario-entities'

interface ClientOption {
  id: string
  name: string
  company_name: string | null
  buyer_role: string | null
  chat_model: string | null
}

interface StyleOption {
  id: string
  name: string
}

interface ScenarioTypeOption {
  key: string
  label: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  companyId: string
  projectProductContext?: string | null
  clients: ClientOption[]
  styles: StyleOption[]
  scenarioTypes: ScenarioTypeOption[]
}

type State = 'idle' | 'working' | 'done' | 'error'

const DEFAULT_SCENARIO_TYPES: ScenarioTypeOption[] = [
  { key: 'discovery', label: 'Descoberta' },
  { key: 'objection_handling', label: 'Contorno de objeções' },
  { key: 'closing', label: 'Fechamento' },
]

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Médio' },
  { value: 'hard', label: 'Difícil' },
  { value: 'trainee_choice', label: 'Aluno escolhe' },
] as const

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

export function CreateScenarioDialog({
  open,
  onOpenChange,
  companyId,
  projectProductContext,
  clients,
  styles,
  scenarioTypes,
}: Props) {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [workingMsg, setWorkingMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [clientId, setClientId] = useState('')
  const [styleId, setStyleId] = useState('')
  const [scenarioType, setScenarioType] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('medium')

  const activeTypes = scenarioTypes.length > 0 ? scenarioTypes : DEFAULT_SCENARIO_TYPES

  function reset() {
    setState('idle')
    setWorkingMsg('')
    setErrorMsg(null)
    setClientId('')
    setStyleId('')
    setScenarioType('')
    setDifficultyLevel('medium')
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(reset, 300)
  }

  useEffect(() => {
    if (!open) setTimeout(reset, 300)
  }, [open])

  const canGenerate = clientId.length > 0 && styleId.length > 0 && scenarioType.length > 0

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
          customer_id: clientId,
          behavior_style_id: styleId,
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

      await createProfileQuick({
        company_id: companyId,
        customer_id: clientId,
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
        visible_briefing: data.profile.visible_briefing,
        visit_objective: data.profile.visit_objective,
        success_criteria: data.profile.success_criteria,
        confidential_context: data.profile.confidential_context,
        sales_process_context: data.profile.sales_process_context,
        sales_competencies_context: data.profile.sales_competencies_context,
        scenario_type: scenarioType,
        difficulty_level: difficultyLevel,
        chat_model: selectedClient?.chat_model ?? null,
        is_active: true,
      })

      setState('done')
      router.refresh()
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  const selectedClient = clients.find((c) => c.id === clientId)

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
              : 'Selecione um cliente e um estilo. A IA monta o cenário com os documentos do cliente.'}
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
            {/* Seletor de cliente */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Cliente <span className="text-red-400">*</span>
              </label>
              {clients.length === 0 ? (
                <p className="rounded-md border border-dashed border-neutral-200 px-3 py-2.5 text-xs text-neutral-400">
                  Nenhum cliente cadastrado neste projeto.{' '}
                  <span className="font-medium">Vá para a aba Clientes para criar.</span>
                </p>
              ) : (
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                >
                  <option value="">Selecionar cliente…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company_name ? ` — ${c.company_name}` : ''}{c.buyer_role ? ` (${c.buyer_role})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedClient && (
                <p className="mt-1 text-xs text-neutral-400">
                  {[selectedClient.company_name, selectedClient.buyer_role].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            {/* Seletor de estilo */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Estilo de comportamento <span className="text-red-400">*</span>
              </label>
              {styles.length === 0 ? (
                <p className="rounded-md border border-dashed border-neutral-200 px-3 py-2.5 text-xs text-neutral-400">
                  Nenhum estilo ativo.{' '}
                  <span className="font-medium">Vá para a aba Estilos para configurar.</span>
                </p>
              ) : (
                <select
                  value={styleId}
                  onChange={(e) => setStyleId(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                >
                  <option value="">Selecionar estilo…</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-4">
              {/* Tipo */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-600">Tipo <span className="text-red-400">*</span></label>
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700"
                    title="Gerenciar tipos"
                  >
                    <Settings className="size-3" />
                    Gerenciar
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeTypes.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setScenarioType(t.key)}
                      className={[
                        'rounded-md border px-3 py-1.5 text-sm transition-colors',
                        scenarioType === t.key
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
                Documentos do cliente usados automaticamente.
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

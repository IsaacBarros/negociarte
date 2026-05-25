'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createCompanyQuick, createCustomerQuick } from '@/lib/actions/scenario-entities'

type ScenarioType = 'discovery' | 'objection_handling' | 'closing'
type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'trainee_choice'

export type GenerateResult = {
  company: {
    id: string
    name: string
    description: null
    industry: string
    company_size: string
    product_context: string
    market_situation: string
    competition_context: string
    marketing_strategy: string
    updated_at: string
  }
  customer: {
    id: string
    name: string
    description: string
    buyer_role: string
    pain_points: string
    objections: string
    budget_context: string
    decision_authority: string
    personality_traits: string
    communication_style: string
    confidential_context: string
    updated_at: string
  }
  scenario: {
    visible_briefing: string
    visit_objective: string
    success_criteria: string
    confidential_context: string
    sales_process_context: string
    sales_competencies_context: string
  }
  scenario_type: ScenarioType
  difficulty_level: DifficultyLevel
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (result: GenerateResult) => void
}

const inputClass =
  'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const selectClass = inputClass + ' bg-white'

type Status = 'idle' | 'generating' | 'creating' | 'done' | 'error'

const statusLabel: Record<Status, string> = {
  idle: 'Gerar',
  generating: 'Gerando persona...',
  creating: 'Salvando empresa e cliente...',
  done: 'Gerar',
  error: 'Tentar novamente',
}

export function GeneratePersonaDialog({ open, onOpenChange, onSuccess }: Props) {
  const [context, setContext] = useState('')
  const [scenarioType, setScenarioType] = useState<ScenarioType>('discovery')
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('medium')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setContext('')
      setScenarioType('discovery')
      setDifficultyLevel('medium')
      setStatus('idle')
      setError(null)
    }
  }, [open])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStatus('generating')

    try {
      const res = await fetch('/api/ai/generate-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          scenario_type: scenarioType,
          difficulty_level: difficultyLevel,
        }),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        throw new Error(json.error ?? 'Erro ao gerar persona')
      }

      const { data } = (await res.json()) as {
        data: {
          company: {
            name: string
            industry: string
            company_size: string
            product_context: string
            market_situation: string
            competition_context: string
            marketing_strategy: string
          }
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
          scenario: {
            visible_briefing: string
            visit_objective: string
            success_criteria: string
            confidential_context: string
            sales_process_context: string
            sales_competencies_context: string
          }
        }
      }

      setStatus('creating')

      const [companyRecord, customerRecord] = await Promise.all([
        createCompanyQuick({
          name: data.company.name,
          industry: data.company.industry,
          company_size: data.company.company_size,
        }),
        createCustomerQuick({
          name: data.customer.name,
          buyer_role: data.customer.buyer_role,
          description: data.customer.description,
        }),
      ])

      const now = new Date().toISOString()

      setStatus('done')
      onSuccess({
        company: {
          id: companyRecord.id,
          name: companyRecord.name,
          description: null,
          industry: data.company.industry,
          company_size: data.company.company_size,
          product_context: data.company.product_context,
          market_situation: data.company.market_situation,
          competition_context: data.company.competition_context,
          marketing_strategy: data.company.marketing_strategy,
          updated_at: now,
        },
        customer: {
          id: customerRecord.id,
          name: customerRecord.name,
          description: data.customer.description,
          buyer_role: data.customer.buyer_role,
          pain_points: data.customer.pain_points,
          objections: data.customer.objections,
          budget_context: data.customer.budget_context,
          decision_authority: data.customer.decision_authority,
          personality_traits: data.customer.personality_traits,
          communication_style: data.customer.communication_style,
          confidential_context: data.scenario.confidential_context,
          updated_at: now,
        },
        scenario: data.scenario,
        scenario_type: scenarioType,
        difficulty_level: difficultyLevel,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    }
  }

  const busy = status === 'generating' || status === 'creating'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar persona automaticamente</DialogTitle>
          <DialogDescription>
            Descreva o contexto de vendas e a IA criará todos os campos da persona.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Contexto do cenário <span className="text-red-500">*</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Uma empresa de software de gestão financeira vendendo para o CFO de uma indústria manufatureira que está insatisfeito com o sistema atual."
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              disabled={busy}
              className={inputClass + ' resize-none'}
            />
            <p className="mt-1 text-xs text-neutral-400">{context.length}/2000</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Tipo de cenário
              </label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value as ScenarioType)}
                disabled={busy}
                className={selectClass}
              >
                <option value="discovery">Descoberta</option>
                <option value="objection_handling">Objeções</option>
                <option value="closing">Fechamento</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Dificuldade
              </label>
              <select
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                disabled={busy}
                className={selectClass}
              >
                <option value="easy">Fácil</option>
                <option value="medium">Médio</option>
                <option value="hard">Difícil</option>
                <option value="trainee_choice">Aluno escolhe</option>
              </select>
            </div>
          </div>

          {status === 'generating' && (
            <p className="text-sm text-neutral-500">Gerando persona com IA...</p>
          )}
          {status === 'creating' && (
            <p className="text-sm text-neutral-500">Salvando empresa e cliente no banco...</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {statusLabel[status]}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

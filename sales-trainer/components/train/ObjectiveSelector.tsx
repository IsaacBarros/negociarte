'use client'

import { Check } from 'lucide-react'
import {
  SESSION_OBJECTIVES,
  SESSION_OBJECTIVE_LABELS,
} from '@/lib/schemas/session'

interface Props {
  /** Objetivos disponíveis. Se vazio/null, usa os 5 padrões do sistema. */
  availableObjectives?: string[] | null
  /** Valor atual selecionado */
  value?: string | null
  onChange: (objective: string) => void
}

export function ObjectiveSelector({ availableObjectives, value, onChange }: Props) {
  const objectives: string[] =
    availableObjectives && availableObjectives.length > 0
      ? availableObjectives
      : [...SESSION_OBJECTIVES]

  function labelFor(obj: string): string {
    return SESSION_OBJECTIVE_LABELS[obj as keyof typeof SESSION_OBJECTIVE_LABELS] ?? obj
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-700">Qual é o objetivo desta visita?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {objectives.map((obj) => {
          const isSelected = value === obj
          return (
            <button
              key={obj}
              type="button"
              onClick={() => onChange(obj)}
              className={[
                'flex items-center gap-2.5 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                isSelected
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400',
              ].join(' ')}
            >
              {isSelected ? (
                <Check className="size-4 shrink-0" />
              ) : (
                <span className="size-4 shrink-0 rounded-full border border-current opacity-40" />
              )}
              <span>{labelFor(obj)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

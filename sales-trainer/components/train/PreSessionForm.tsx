'use client'

import { useState, useTransition } from 'react'
import { ObjectiveSelector } from './ObjectiveSelector'
import { createSession } from '@/lib/actions/sessions'
import { type SessionObjective } from '@/lib/schemas/session'

const DIFFICULTY_OPTIONS = [
  {
    value: 'easy' as const,
    label: 'Fácil',
    description: 'Cliente receptivo, poucos obstáculos.',
    color: 'border-green-200 data-[selected=true]:border-green-600 data-[selected=true]:bg-green-50',
    badge: 'bg-green-100 text-green-700',
  },
  {
    value: 'medium' as const,
    label: 'Médio',
    description: 'Algumas objeções e resistências esperadas.',
    color: 'border-yellow-200 data-[selected=true]:border-yellow-600 data-[selected=true]:bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  {
    value: 'hard' as const,
    label: 'Difícil',
    description: 'Cliente exigente, pressão alta, muitas objeções.',
    color: 'border-red-200 data-[selected=true]:border-red-600 data-[selected=true]:bg-red-50',
    badge: 'bg-red-100 text-red-700',
  },
]

interface PreSessionFormProps {
  profileId: string
  availableObjectives: string[] | null
  defaultDifficulty?: 'easy' | 'medium' | 'hard' | 'trainee_choice' | null
}

export function PreSessionForm({
  profileId,
  availableObjectives,
  defaultDifficulty,
}: PreSessionFormProps) {
  const initialDifficulty: 'easy' | 'medium' | 'hard' =
    defaultDifficulty && defaultDifficulty !== 'trainee_choice' ? defaultDifficulty : 'medium'

  const [objective, setObjective] = useState<SessionObjective | null>(null)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialDifficulty)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canStart = !!objective

  function handleStart() {
    if (!objective) return
    setError(null)

    startTransition(async () => {
      try {
        await createSession({
          customer_profile_id: profileId,
          chosen_objective: objective,
          difficulty_level: difficulty,
        })
      } catch (err) {
        // NEXT_REDIRECT é uma exceção especial do Next.js — não é um erro real
        if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
          setError('Erro ao iniciar a simulação. Tente novamente.')
          console.error(err)
        }
        // Se for NEXT_REDIRECT, deixa a navegação acontecer normalmente
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Seleção de objetivo */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <ObjectiveSelector
          availableObjectives={availableObjectives}
          value={objective}
          onChange={setObjective}
        />
      </div>

      {/* Seleção de dificuldade */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <p className="mb-3 text-sm font-medium text-neutral-700">
          Qual o grau de dificuldade?
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const isSelected = difficulty === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                data-selected={isSelected}
                onClick={() => setDifficulty(opt.value)}
                className={[
                  'flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors',
                  opt.color,
                  isSelected ? 'ring-1 ring-current' : 'bg-white hover:bg-neutral-50',
                ].join(' ')}
              >
                <span
                  className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${opt.badge}`}
                >
                  {opt.label}
                </span>
                <span className="text-xs leading-snug text-neutral-500">{opt.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between">
        <a href="/train" className="text-sm text-neutral-400 hover:text-neutral-700">
          ← Voltar
        </a>
        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart || isPending}
          className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Iniciando...' : 'Iniciar simulação →'}
        </button>
      </div>

      {!canStart && (
        <p className="text-center text-xs text-neutral-400">Escolha um objetivo para continuar</p>
      )}
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ObjectiveSelector } from './ObjectiveSelector'
import { updateSessionObjective } from '@/lib/actions/sessions'

interface Props {
  sessionId: string
  initialObjective: string | null
  availableObjectives: string[] | null
}

export function BriefingStartSection({ sessionId, initialObjective, availableObjectives }: Props) {
  const [objective, setObjective] = useState<string | null>(initialObjective)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const canStart = !!objective || !!initialObjective

  function handleStart() {
    startTransition(async () => {
      if (objective && !initialObjective) {
        await updateSessionObjective(sessionId, { chosen_objective: objective })
      }
      router.push(`/train/${sessionId}`)
    })
  }

  return (
    <div className="space-y-4 pt-2">
      {!initialObjective && (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <ObjectiveSelector
            availableObjectives={availableObjectives}
            value={objective}
            onChange={setObjective}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <a
          href="/train"
          className="text-sm text-neutral-400 hover:text-neutral-700"
        >
          ← Voltar aos cenários
        </a>
        <button
          onClick={handleStart}
          disabled={isPending || !canStart}
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Entrando...' : 'Estou pronto — iniciar conversa'}
        </button>
      </div>
    </div>
  )
}

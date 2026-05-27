'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Sliders, Users, TrendingUp } from 'lucide-react'
import { createSession } from '@/lib/actions/sessions'

interface Props {
  customerProfileId: string
  lastDifficultyLevel: string | null
}

type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
}

export function PostSessionActions({ customerProfileId, lastDifficultyLevel }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  function startNewSession(difficultyLevel?: Difficulty) {
    setActionError(null)
    setShowModal(false)
    startTransition(async () => {
      try {
        await createSession({
          customer_profile_id: customerProfileId,
          ...(difficultyLevel ? { difficulty_level: difficultyLevel } : {}),
        })
      } catch (err) {
        // redirect() throws an internal error — only capture real errors
        if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) {
          setActionError(err.message)
        }
      }
    })
  }

  return (
    <>
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-2">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          O que você quer fazer agora?
        </p>

        {actionError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{actionError}</p>
        )}

        {/* Repetir mesmo cenário */}
        <button
          onClick={() => startNewSession(lastDifficultyLevel as Difficulty | undefined)}
          disabled={isPending}
          className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left text-sm transition-colors hover:border-neutral-400 disabled:opacity-50"
        >
          <RotateCcw className="size-4 shrink-0 text-neutral-500" />
          <div>
            <p className="font-medium text-neutral-800">Repetir mesmo cenário</p>
            <p className="text-xs text-neutral-400">Mesmas configurações</p>
          </div>
        </button>

        {/* Repetir com outra dificuldade */}
        <button
          onClick={() => setShowModal(true)}
          disabled={isPending}
          className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left text-sm transition-colors hover:border-neutral-400 disabled:opacity-50"
        >
          <Sliders className="size-4 shrink-0 text-neutral-500" />
          <div>
            <p className="font-medium text-neutral-800">Repetir com outra dificuldade</p>
            <p className="text-xs text-neutral-400">Mude o nível do desafio</p>
          </div>
        </button>

        {/* Novo cliente */}
        <button
          onClick={() => router.push('/train')}
          disabled={isPending}
          className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left text-sm transition-colors hover:border-neutral-400 disabled:opacity-50"
        >
          <Users className="size-4 shrink-0 text-neutral-500" />
          <div>
            <p className="font-medium text-neutral-800">Escolher novo cliente</p>
            <p className="text-xs text-neutral-400">Explore outros cenários</p>
          </div>
        </button>

        {/* Ver progresso */}
        <button
          onClick={() => router.push('/train/history')}
          disabled={isPending}
          className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left text-sm transition-colors hover:border-neutral-400 disabled:opacity-50"
        >
          <TrendingUp className="size-4 shrink-0 text-neutral-500" />
          <div>
            <p className="font-medium text-neutral-800">Ver meu progresso</p>
            <p className="text-xs text-neutral-400">Histórico e métricas</p>
          </div>
        </button>
      </div>

      {/* Modal de seleção de dificuldade */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-sm font-semibold text-neutral-900">
              Escolha a dificuldade
            </h3>
            <div className="space-y-2">
              {(['easy', 'medium', 'hard'] as const).map((d) => {
                const isCurrent = d === lastDifficultyLevel
                return (
                  <button
                    key={d}
                    onClick={() => startNewSession(d)}
                    disabled={isPending}
                    className={[
                      'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors disabled:opacity-50',
                      isCurrent
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 hover:border-neutral-400',
                    ].join(' ')}
                  >
                    <span>{DIFFICULTY_LABELS[d]}</span>
                    {isCurrent && (
                      <span className="text-xs opacity-60">atual</span>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full text-center text-sm text-neutral-400 hover:text-neutral-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

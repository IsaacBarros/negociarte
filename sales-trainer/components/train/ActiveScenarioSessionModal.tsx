'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { abandonActiveScenarioSession } from '@/lib/actions/sessions'

interface ActiveSession {
  id: string
  title: string | null
  difficultyLevel: 'easy' | 'medium' | 'hard' | null
}

interface Props {
  activeSession: ActiveSession
  profileId: string
  profileName: string
}

const difficultyLabel: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
}

export function ActiveScenarioSessionModal({ activeSession, profileId, profileName }: Props) {
  const [isPending, startTransition] = useTransition()

  const difficulty = activeSession.difficultyLevel ?? 'medium'

  function handleCreateNew() {
    startTransition(async () => {
      try {
        await abandonActiveScenarioSession(profileId)
      } catch (err) {
        if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
          console.error(err)
        }
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white shadow-2xl">
        <div className="border-b border-neutral-100 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Sessão ativa encontrada
          </p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">
            Você já tem uma sessão ativa para este cenário
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Encontramos uma simulação em andamento para {profileName}. Isso evita que você
            configure uma nova conversa sem decidir o que fazer com a anterior.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Sessão atual
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-900">
              {activeSession.title ?? profileName}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs text-neutral-600">
                Dificuldade: {difficultyLabel[difficulty] ?? difficulty}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Abrir sessão atual</h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Continua exatamente de onde você parou. Use esta opção para revisar, encerrar,
                abandonar ou avaliar a sessão antes de decidir começar outra.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Criar nova sessão</h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Abandona a sessão ativa deste cenário e volta para a tela de configuração, onde
                você escolhe um novo objetivo e a dificuldade antes de começar outra simulação.
              </p>
            </div>
          </div>

        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-neutral-100 bg-neutral-50 px-6 py-4 sm:flex-row sm:justify-end">
          <Link
            href={`/train/${activeSession.id}`}
            className="rounded-lg border border-neutral-900 bg-white px-4 py-2.5 text-center text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
          >
            Abrir sessão atual
          </Link>
          <button
            type="button"
            onClick={handleCreateNew}
            disabled={isPending}
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Liberando...' : 'Criar nova sessão'}
          </button>
        </div>
      </div>
    </div>
  )
}

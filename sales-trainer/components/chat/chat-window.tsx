'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChatStream } from '@/hooks/use-chat-stream'
import { MessageList } from './message-list'
import { Composer } from './composer'
import { endSession } from '@/lib/actions/sessions'
import type { UIMessage } from 'ai'

interface BriefingContext {
  buyerRole?: string | null
  visibleBriefing?: string | null
  visitObjective?: string | null
  successCriteria?: string | null
  scenarioType?: string | null
}

interface Props {
  sessionId: string
  profileName: string
  initialMessages: UIMessage[]
  sessionEnded: boolean
  sessionStatus: string
  briefingContext?: BriefingContext
}

const scenarioLabel: Record<string, string> = {
  discovery: 'Discovery',
  objection_handling: 'Objeções',
  closing: 'Fechamento',
}

export function ChatWindow({
  sessionId,
  profileName,
  initialMessages,
  sessionEnded,
  sessionStatus,
  briefingContext,
}: Props) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [briefingOpen, setBriefingOpen] = useState(false)
  const { messages, sendMessage, status, stop } = useChatStream(sessionId, initialMessages)

  const isLoading = status === 'submitted' || status === 'streaming'

  function handleInputChange(value: string) {
    setInput(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    await sendMessage({ text })
  }

  async function handleEndSession(s: 'completed' | 'abandoned') {
    await endSession({ session_id: sessionId, status: s })
    router.refresh()
  }

  const hasBriefing =
    briefingContext &&
    (briefingContext.visibleBriefing ||
      briefingContext.visitObjective ||
      briefingContext.successCriteria)

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-neutral-400">Treinando com</p>
              <p className="text-sm font-medium">{profileName}</p>
            </div>
            {briefingContext?.buyerRole && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                {briefingContext.buyerRole}
              </span>
            )}
            {briefingContext?.scenarioType && scenarioLabel[briefingContext.scenarioType] && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                {scenarioLabel[briefingContext.scenarioType]}
              </span>
            )}
            {hasBriefing && (
              <button
                type="button"
                onClick={() => setBriefingOpen((o) => !o)}
                className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
              >
                {briefingOpen ? 'Fechar briefing ↑' : 'Ver briefing ↓'}
              </button>
            )}
          </div>

          {!sessionEnded && (
            <div className="flex gap-2">
              <button
                onClick={() => handleEndSession('abandoned')}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
              >
                Abandonar
              </button>
              <button
                onClick={() => handleEndSession('completed')}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700"
              >
                Encerrar e avaliar
              </button>
            </div>
          )}

          {sessionEnded && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
              Sessão encerrada
            </span>
          )}
        </div>

        {/* Painel de briefing colapsável */}
        {hasBriefing && briefingOpen && (
          <div className="grid gap-3 border-t border-neutral-100 bg-neutral-50 px-4 py-3 sm:grid-cols-3">
            {briefingContext?.visibleBriefing && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Contexto
                </p>
                <p className="text-xs leading-relaxed text-neutral-600">
                  {briefingContext.visibleBriefing}
                </p>
              </div>
            )}
            {briefingContext?.visitObjective && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Objetivo
                </p>
                <p className="text-xs leading-relaxed text-neutral-600">
                  {briefingContext.visitObjective}
                </p>
              </div>
            )}
            {briefingContext?.successCriteria && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Sucesso
                </p>
                <p className="text-xs leading-relaxed text-neutral-600">
                  {briefingContext.successCriteria}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mensagens */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Composer */}
      {!sessionEnded && (
        <Composer
          input={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onStop={stop}
          isLoading={isLoading}
        />
      )}

      {sessionEnded && (
        <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-500">
          {sessionStatus === 'abandoned'
            ? 'Sessão abandonada. Nenhum relatório será gerado.'
            : 'Sessão encerrada. O feedback estará disponível em breve.'}
        </div>
      )}
    </div>
  )
}

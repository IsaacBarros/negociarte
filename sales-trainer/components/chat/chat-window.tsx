'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChatStream } from '@/hooks/use-chat-stream'
import { MessageList } from './message-list'
import { Composer } from './composer'
import { endSession } from '@/lib/actions/sessions'
import type { UIMessage } from 'ai'

interface Props {
  sessionId: string
  profileName: string
  initialMessages: UIMessage[]
  sessionEnded: boolean
}

export function ChatWindow({ sessionId, profileName, initialMessages, sessionEnded }: Props) {
  const router = useRouter()
  const [input, setInput] = useState('')
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

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
        <div>
          <p className="text-xs text-neutral-400">Treinando com</p>
          <p className="text-sm font-medium">{profileName}</p>
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
          Sessão encerrada. O feedback estará disponível em breve.
        </div>
      )}
    </div>
  )
}

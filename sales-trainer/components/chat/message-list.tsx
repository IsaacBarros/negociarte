'use client'

import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import { MessageBubble } from './message-bubble'

interface Props {
  messages: UIMessage[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
        Envie sua primeira mensagem para iniciar o treino.
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
      {messages.map((msg, i) => {
        const textPart = msg.parts.find((p) => p.type === 'text')
        const content = textPart?.type === 'text' ? textPart.text : ''
        return (
          <MessageBubble
            key={msg.id}
            role={msg.role as 'user' | 'assistant'}
            content={content}
            isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant'}
          />
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

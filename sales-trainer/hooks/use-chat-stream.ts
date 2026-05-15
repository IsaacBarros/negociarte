'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'

export function useChatStream(sessionId: string, initialMessages: UIMessage[] = []) {
  return useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { session_id: sessionId },
    }),
    messages: initialMessages,
    id: sessionId,
  })
}

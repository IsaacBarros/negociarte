'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FeedbackCard } from './feedback-card'
import type { Database } from '@/types/database'

type Feedback = Database['public']['Tables']['session_feedback']['Row']

interface Props {
  sessionId: string
}

const POLL_INTERVAL_MS = 5000
const MAX_WAIT_MS = 120_000

export function FeedbackPoller({ sessionId }: Props) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const supabase = createClient()

    async function fetchFeedback() {
      const { data } = await supabase
        .from('session_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (data) {
        setFeedback(data as Feedback)
        if (intervalRef.current) clearInterval(intervalRef.current)
      } else if (Date.now() - startRef.current > MAX_WAIT_MS) {
        setTimedOut(true)
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }

    void fetchFeedback()
    intervalRef.current = setInterval(() => void fetchFeedback(), POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sessionId])

  if (!feedback) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Avaliação da sessão</h2>
          <p className="text-xs text-neutral-400">Gerada por IA</p>
        </div>
        {timedOut ? (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3">
            <p className="text-xs text-red-600">
              A avaliação demorou mais do que o esperado. Tente recarregar a página em alguns instantes.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-3">
            <div className="size-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
            <p className="text-xs text-neutral-500">Gerando avaliação...</p>
          </div>
        )}
      </div>
    )
  }

  return <FeedbackCard feedback={feedback} />
}

'use client'

import { useEffect, useState } from 'react'
import type { CustomerProfileInput } from '@/lib/schemas/profile'

interface Options {
  values: CustomerProfileInput
  mode: 'create' | 'edit'
  orgId: string
  profileId?: string
}

export type DraftStatus = 'idle' | 'saving' | 'saved'

export function draftKeyFor(mode: 'create' | 'edit', orgId: string, profileId?: string) {
  return `negociarte_profile_draft_${mode === 'create' ? orgId : profileId}`
}

export function useProfileAutoSave({ values, mode, orgId, profileId }: Options) {
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle')
  const key = draftKeyFor(mode, orgId, profileId)

  useEffect(() => {
    if (!key || typeof window === 'undefined') return

    const timer = window.setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(values))
      setDraftStatus('saved')
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [key, values])

  function clearDraft() {
    if (!key || typeof window === 'undefined') return
    localStorage.removeItem(key)
    setDraftStatus('idle')
  }

  return { draftStatus, clearDraft }
}

'use client'

import { Loader2, Sparkles } from 'lucide-react'

interface Props {
  loading: boolean
  onClick: () => void
}

export function SuggestButton({ loading, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
      Sugerir
    </button>
  )
}

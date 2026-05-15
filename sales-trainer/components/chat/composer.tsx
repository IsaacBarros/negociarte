'use client'

import { useRef, useEffect } from 'react'

interface Props {
  input: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onStop: () => void
  isLoading: boolean
  disabled?: boolean
}

export function Composer({ input, onChange, onSubmit, onStop, isLoading, disabled }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [input])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && input.trim()) {
        onSubmit(e as unknown as React.FormEvent)
      }
    }
  }

  return (
    <div className="border-t border-neutral-200 bg-white px-4 py-3">
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          rows={1}
          placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para quebrar linha)"
          className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
        />

        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="shrink-0 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600"
          >
            Parar
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            Enviar
          </button>
        )}
      </form>
    </div>
  )
}

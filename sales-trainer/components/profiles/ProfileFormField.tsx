'use client'

import { RotateCcw } from 'lucide-react'
import { SuggestButton } from '@/components/profiles/SuggestButton'

interface Props {
  label: string
  error?: string
  required?: boolean
  suggestable?: boolean
  suggestLoading?: boolean
  onSuggest?: () => void
  isPresetField?: boolean
  onResetPreset?: () => void
  children: React.ReactNode
}

export function ProfileFormField({
  label,
  error,
  required,
  suggestable,
  suggestLoading = false,
  onSuggest,
  isPresetField,
  onResetPreset,
  children,
}: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-800">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {isPresetField && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
              Padrão
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isPresetField && onResetPreset && (
            <button
              type="button"
              onClick={onResetPreset}
              className="inline-flex size-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              aria-label="Resetar campo"
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}
          {suggestable && onSuggest && <SuggestButton loading={suggestLoading} onClick={onSuggest} />}
        </div>
      </div>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

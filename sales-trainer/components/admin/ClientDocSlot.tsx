'use client'

import { useRef, useState } from 'react'
import { FileText, Upload, X, ChevronDown, ChevronUp } from 'lucide-react'

export type EntityType = 'customer' | 'criteria'

export interface DocSlotValue {
  file_path: string | null
  extracted_text: string | null
}

interface Props {
  label: string
  description?: string
  entityType: EntityType
  entityId: string
  field: string
  value: DocSlotValue | null
  onUpdate: (value: DocSlotValue) => void
}

export function ClientDocSlot({ label, description, entityType, entityId, field, value, onUpdate }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasDoc = !!(value?.extracted_text)

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('entity_type', entityType)
      fd.append('entity_id', entityId)
      fd.append('field', field)
      fd.append('file', file)

      const res = await fetch('/api/knowledge/upload-entity-doc', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erro ao enviar arquivo')
      }
      const data = await res.json() as { file_path: string | null; extracted_text: string }
      onUpdate({ file_path: data.file_path, extracted_text: data.extracted_text })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setUploading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  const previewText = value?.extracted_text
    ? value.extracted_text.slice(0, 300) + (value.extracted_text.length > 300 ? '…' : '')
    : null

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-neutral-700">{label}</p>
          {description && !hasDoc && (
            <p className="mt-0.5 text-xs text-neutral-400">{description}</p>
          )}
        </div>

        {hasDoc ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-50"
            >
              Substituir
            </button>
            <span className="text-neutral-200">|</span>
            <button
              type="button"
              onClick={() => onUpdate({ file_path: null, extracted_text: null })}
              className="text-xs text-neutral-400 hover:text-red-600"
              aria-label="Remover"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50"
          >
            <Upload className="size-3.5" />
            {uploading ? 'Enviando…' : 'Upload PDF'}
          </button>
        )}
      </div>

      {hasDoc && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600"
          >
            <FileText className="size-3.5 text-green-500" />
            <span className="text-green-700">Documento carregado</span>
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
          {expanded && previewText && (
            <p className="mt-1.5 rounded bg-neutral-50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-neutral-500 whitespace-pre-wrap">
              {previewText}
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

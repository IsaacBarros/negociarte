'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Upload, X, ChevronDown, ChevronUp, Sparkles, Pencil, Check } from 'lucide-react'
import { updateEntityDocText } from '@/lib/actions/scenario-entities'

export type EntityType = 'customer' | 'criteria'

export interface DocSlotValue {
  file_path: string | null
  extracted_text: string | null
}

type CustomerField = 'business_profile' | 'pain_objections' | 'relationship_history'

interface Props {
  label: string
  description?: string
  entityType: EntityType
  entityId: string
  field: string
  value: DocSlotValue | null
  onUpdate: (value: DocSlotValue) => void
  /** Ativa análise IA automática pós-upload. Só funciona com entityType='customer'. */
  analyzeWithAI?: boolean
}

const CUSTOMER_FIELDS: CustomerField[] = ['business_profile', 'pain_objections', 'relationship_history']

function isCustomerField(field: string): field is CustomerField {
  return CUSTOMER_FIELDS.includes(field as CustomerField)
}

export function ClientDocSlot({
  label,
  description,
  entityType,
  entityId,
  field,
  value,
  onUpdate,
  analyzeWithAI = true,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [isAIAnalyzed, setIsAIAnalyzed] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isSaving, startSaveTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const hasDoc = !!(value?.extracted_text)
  const isLoading = uploading || analyzing

  async function runAIAnalysis(entityId: string, field: string, extractedText: string): Promise<string | null> {
    try {
      const res = await fetch('/api/ai/analyze-client-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: entityId, field, extracted_text: extractedText }),
      })
      if (!res.ok) return null
      const data = await res.json() as { structured_text: string }
      return data.structured_text
    } catch {
      return null
    }
  }

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    setIsAIAnalyzed(false)
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

      // Atualiza com texto bruto primeiro
      onUpdate({ file_path: data.file_path, extracted_text: data.extracted_text })
      setUploading(false)

      // Análise IA automática (apenas para clientes)
      if (analyzeWithAI && entityType === 'customer' && isCustomerField(field) && data.extracted_text) {
        setAnalyzing(true)
        const structured = await runAIAnalysis(entityId, field, data.extracted_text)
        if (structured) {
          onUpdate({ file_path: data.file_path, extracted_text: structured })
          setIsAIAnalyzed(true)
        }
        setAnalyzing(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setUploading(false)
      setAnalyzing(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  function startEditing() {
    setEditValue(value?.extracted_text ?? '')
    setIsEditing(true)
    setExpanded(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditValue('')
  }

  function saveEdit() {
    const trimmed = editValue.trim()
    startSaveTransition(async () => {
      try {
        await updateEntityDocText({ entity_type: entityType, entity_id: entityId, field, text: trimmed })
        onUpdate({ file_path: value?.file_path ?? null, extracted_text: trimmed })
        setIsEditing(false)
        setEditValue('')
        setIsAIAnalyzed(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

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
              disabled={isLoading}
              className="text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-50"
            >
              Substituir
            </button>
            <span className="text-neutral-200">|</span>
            <button
              type="button"
              onClick={() => { onUpdate({ file_path: null, extracted_text: null }); setIsAIAnalyzed(false) }}
              disabled={isLoading}
              className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
              aria-label="Remover"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50"
          >
            <Upload className="size-3.5" />
            {uploading ? 'Enviando…' : 'Upload PDF'}
          </button>
        )}
      </div>

      {/* Estados de carregamento */}
      {uploading && (
        <p className="mt-2 text-xs text-neutral-400">Extraindo texto do PDF…</p>
      )}
      {analyzing && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-violet-600">
          <Sparkles className="size-3.5 animate-pulse" />
          Processando com IA…
        </p>
      )}

      {hasDoc && !isLoading && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600"
            >
              {isAIAnalyzed ? (
                <Sparkles className="size-3.5 text-violet-500" />
              ) : (
                <FileText className="size-3.5 text-green-500" />
              )}
              <span className={isAIAnalyzed ? 'text-violet-700' : 'text-green-700'}>
                {isAIAnalyzed ? 'Analisado com IA' : 'Documento carregado'}
              </span>
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {!isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="flex items-center gap-0.5 text-xs text-neutral-400 hover:text-neutral-700"
                title="Editar conteúdo"
              >
                <Pencil className="size-3" />
                Editar
              </button>
            )}
          </div>

          {expanded && !isEditing && value?.extracted_text && (
            <p className="mt-1.5 max-h-48 overflow-y-auto rounded bg-neutral-50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-neutral-500 whitespace-pre-wrap">
              {value.extracted_text}
            </p>
          )}

          {isEditing && (
            <div className="mt-2 space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs leading-relaxed text-neutral-700 focus:border-neutral-500 focus:outline-none resize-y"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  <Check className="size-3.5" />
                  {isSaving ? 'Salvando…' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { createBehaviorStyle, toggleBehaviorStyle, deleteBehaviorStyle } from '@/lib/actions/behavior-styles'
import { Eye, EyeOff, Trash2, Plus, Wand2 } from 'lucide-react'

interface Style {
  id: string
  name: string
  description: string
  simulation_guidance: string
  evaluation_criteria: string | null
  is_active: boolean
}

interface ParsedStyle {
  name: string
  description: string
  simulation_guidance: string
  evaluation_criteria?: string
}

interface Props {
  styles: Style[]
  selectedStyleId?: string
  onSelectStyle?: (id: string) => void
}

interface StyleCardProps {
  style: Style
  isSelected: boolean
  onSelectStyle?: (id: string) => void
}

function StyleCard({ style, isSelected, onSelectStyle }: StyleCardProps) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await toggleBehaviorStyle({ style_id: style.id, is_active: !style.is_active })
    })
  }

  function handleDelete() {
    if (!confirm(`Remover o estilo "${style.name}"?`)) return
    startTransition(async () => {
      await deleteBehaviorStyle({ style_id: style.id })
    })
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        isSelected
          ? 'border-neutral-900 ring-1 ring-neutral-900'
          : style.is_active
            ? 'border-neutral-200'
            : 'border-neutral-100 bg-neutral-50 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800">{style.name}</p>
          <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
            {style.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onSelectStyle && (
            isSelected ? (
              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
                Selecionado
              </span>
            ) : (
              <button
                onClick={() => onSelectStyle(style.id)}
                disabled={isPending}
                className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-50"
              >
                Usar neste cenário
              </button>
            )
          )}
          <button
            onClick={handleToggle}
            disabled={isPending}
            title={style.is_active ? 'Desativar' : 'Ativar'}
            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-50"
          >
            {style.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            title="Remover"
            className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function BehaviorStylesSection({ styles, selectedStyleId, onSelectStyle }: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showAiParser, setShowAiParser] = useState(false)
  const [aiText, setAiText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedStyle | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Manual create form state
  const [form, setForm] = useState<ParsedStyle>({
    name: '',
    description: '',
    simulation_guidance: '',
    evaluation_criteria: '',
  })

  async function handleParseAi() {
    if (!aiText.trim()) return
    setIsParsing(true)
    setParseError(null)
    try {
      const res = await fetch('/api/ai/parse-behavior-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      })
      if (!res.ok) throw new Error('Erro ao processar texto.')
      const data = await res.json() as { style: ParsedStyle }
      setParsed(data.style)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setIsParsing(false)
    }
  }

  function saveStyle(data: ParsedStyle) {
    startTransition(async () => {
      await createBehaviorStyle(data)
      setParsed(null)
      setAiText('')
      setShowAiParser(false)
      setShowCreateForm(false)
      setForm({ name: '', description: '', simulation_guidance: '', evaluation_criteria: '' })
    })
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => { setShowCreateForm(true); setShowAiParser(false) }}
          className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          <Plus className="size-4" />
          Novo estilo
        </button>
        <button
          onClick={() => { setShowAiParser(true); setShowCreateForm(false) }}
          className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          <Wand2 className="size-4" />
          Criar com IA
        </button>
      </div>

      {/* AI Parser */}
      {showAiParser && !parsed && (
        <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Criar estilo a partir de texto
          </p>
          <p className="text-xs text-neutral-500">
            Cole uma descrição do estilo comportamental. A IA extrairá nome, descrição e orientações de simulação.
          </p>
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            rows={6}
            placeholder="Descreva o estilo comportamental do comprador: perfil, como age, o que valoriza..."
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none resize-none"
          />
          {parseError && <p className="text-xs text-red-600">{parseError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleParseAi}
              disabled={isParsing || !aiText.trim()}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {isParsing ? 'Processando...' : 'Analisar com IA'}
            </button>
            <button
              onClick={() => { setShowAiParser(false); setAiText(''); setParseError(null) }}
              className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* AI Result Preview */}
      {parsed && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Resultado da IA — revise antes de salvar
          </p>
          <div className="space-y-2">
            {(
              [
                { label: 'Nome', key: 'name' },
                { label: 'Descrição', key: 'description' },
                { label: 'Como simular', key: 'simulation_guidance' },
                { label: 'Critério de avaliação', key: 'evaluation_criteria' },
              ] as const
            ).map(({ label, key }) =>
              parsed[key] ? (
                <div key={key}>
                  <p className="text-xs font-medium text-blue-800">{label}</p>
                  <p className="text-xs text-blue-700 leading-relaxed">{parsed[key]}</p>
                </div>
              ) : null,
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => saveStyle(parsed)}
              disabled={isPending}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {isPending ? 'Salvando...' : 'Salvar estilo'}
            </button>
            <button
              onClick={() => setParsed(null)}
              className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-white"
            >
              Editar texto
            </button>
          </div>
        </div>
      )}

      {/* Manual create form */}
      {showCreateForm && (
        <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Novo estilo manual
          </p>
          {(
            [
              { label: 'Nome *', key: 'name', placeholder: 'Ex: Analítico Detalhista', rows: 1 },
              { label: 'Descrição *', key: 'description', placeholder: 'Perfil geral do comprador...', rows: 2 },
              { label: 'Como simular *', key: 'simulation_guidance', placeholder: 'Instruções de como a IA deve interpretar este estilo...', rows: 4 },
              { label: 'Critério de avaliação', key: 'evaluation_criteria', placeholder: 'Como avaliar se o vendedor se adaptou ao estilo...', rows: 2 },
            ] as const
          ).map(({ label, key, placeholder, rows }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
              <textarea
                value={form[key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                rows={rows}
                placeholder={placeholder}
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none resize-none"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={() => saveStyle(form)}
              disabled={isPending || !form.name.trim() || !form.description.trim() || !form.simulation_guidance.trim()}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Styles list */}
      {styles.length === 0 && !showCreateForm && !showAiParser && (
        <p className="text-sm text-neutral-400">Nenhum estilo de comportamento criado ainda.</p>
      )}
      {styles.map((style) => (
        <StyleCard
          key={style.id}
          style={style}
          isSelected={selectedStyleId === style.id}
          onSelectStyle={onSelectStyle}
        />
      ))}
    </div>
  )
}

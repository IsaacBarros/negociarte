'use client'

import { useState, useTransition } from 'react'
import { createScenarioType, deleteScenarioType } from '@/lib/actions/scenario-types'

interface ScenarioType {
  id: string
  key: string
  label: string
  description: string
  sort_order: number
  is_active: boolean
  created_at: string
}

interface Props {
  initialTypes: ScenarioType[]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function ScenarioTypesSection({ initialTypes }: Props) {
  const [types, setTypes] = useState(initialTypes)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleLabelChange(v: string) {
    setLabel(v)
    if (!keyManuallyEdited) setKey(slugify(v))
  }

  function resetForm() {
    setLabel('')
    setKey('')
    setKeyManuallyEdited(false)
    setDescription('')
    setFormError(null)
    setShowForm(false)
  }

  function handleCreate() {
    setFormError(null)
    startTransition(async () => {
      try {
        const created = await createScenarioType({ key, label, description })
        setTypes((prev) => [...prev, created])
        resetForm()
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Erro ao criar.')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteScenarioType(id)
      setTypes((prev) => prev.filter((t) => t.id !== id))
      setPendingDeleteId(null)
    })
  }

  const canCreate = label.trim().length > 0 && key.trim().length > 0 && description.trim().length >= 10

  return (
    <div className="space-y-4">
      {/* Lista */}
      {types.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-10 text-center">
          <p className="text-sm text-neutral-500">Nenhum tipo configurado.</p>
          <p className="mt-1 text-xs text-neutral-400">
            O sistema usa os 3 tipos padrão: Descoberta, Contorno de objeções e Fechamento.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {types.map((t) => {
          const isPendingDelete = pendingDeleteId === t.id
          return (
            <div key={t.id} className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-900">{t.label}</p>
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-500">
                      {t.key}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{t.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isPendingDelete ? (
                    <>
                      <span className="text-xs text-neutral-500">Remover?</span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={isPending}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(null)}
                        className="text-xs text-neutral-400 hover:underline"
                      >
                        Não
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setPendingDeleteId(t.id)}
                      className="text-xs text-neutral-400 hover:text-red-500"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Formulário de criação */}
      {showForm ? (
        <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Novo tipo de cenário
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Ex: Negociação de preço"
                className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                Chave (key) <span className="text-red-500">*</span>
              </label>
              <input
                value={key}
                onChange={(e) => { setKey(e.target.value); setKeyManuallyEdited(true) }}
                placeholder="negociacao_preco"
                className="w-full rounded-md border border-neutral-200 px-3 py-1.5 font-mono text-sm focus:border-neutral-400 focus:outline-none"
              />
              <p className="mt-0.5 text-xs text-neutral-400">Minúsculas, números e underscore.</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">
              Descrição para a IA <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Ex: negociação de preço (o cliente questiona o valor e o vendedor precisa defender o preço ou oferecer alternativas)"
              className="w-full resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            />
            <p className="mt-0.5 text-xs text-neutral-400">
              Texto injetado no prompt de geração. Descreva o foco da simulação.
            </p>
          </div>

          {formError && <p className="text-xs text-red-600">{formError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!canCreate || isPending}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {isPending ? 'Criando...' : 'Criar tipo'}
            </button>
            <button
              onClick={resetForm}
              className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          + Novo tipo
        </button>
      )}
    </div>
  )
}

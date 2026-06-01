'use client'

import { useState, useTransition, Fragment, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  createEvaluationCriteria,
  updateEvaluationCriteria,
  updateCustomCriteria,
} from '@/lib/actions/evaluation-criteria'
import { Wand2, CheckCircle, Paperclip, X, Plus, Trash2, Pencil } from 'lucide-react'
import { ClientDocSlot, type DocSlotValue } from './ClientDocSlot'

interface Behavior {
  key: string
  label: string
  weight: number
}

interface Stage {
  key: string
  label: string
  behaviors: Behavior[]
}

interface CustomCriterion {
  id: string
  name: string
  text: string
}

interface Criteria {
  id: string
  name: string
  stages: Stage[]
  total_points: number
  is_active: boolean
  sales_process_text?: string | null
  sales_process_file_path?: string | null
  style_alignment_text?: string | null
  style_alignment_file_path?: string | null
  result_adherence_text?: string | null
  result_adherence_file_path?: string | null
  competencies_text?: string | null
  competencies_file_path?: string | null
  custom_criteria?: unknown
}

interface Props {
  companyId: string
  activeCriteria: Criteria | null
}

function parseCustomCriteria(raw: unknown): CustomCriterion[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is CustomCriterion =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      typeof (item as Record<string, unknown>).name === 'string' &&
      typeof (item as Record<string, unknown>).text === 'string',
  )
}

function randKey(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}_${rand}`
}

function calcTotal(stages: Stage[]): number {
  return stages.reduce((sum, s) => sum + s.behaviors.reduce((bs, b) => bs + b.weight, 0), 0)
}

// ─── Inline stage/behavior editor ─────────────────────────────────────────────

interface StagesEditorProps {
  stages: Stage[]
  onChange: (stages: Stage[]) => void
}

function StagesEditor({ stages, onChange }: StagesEditorProps) {
  function updateStageLabel(stageIdx: number, label: string) {
    onChange(stages.map((s, i) => (i === stageIdx ? { ...s, label } : s)))
  }

  function deleteStage(stageIdx: number) {
    if (stages.length <= 1) return
    onChange(stages.filter((_, i) => i !== stageIdx))
  }

  function addStage() {
    const newStage: Stage = {
      key: randKey('etapa'),
      label: 'Nova etapa',
      behaviors: [{ key: randKey('comportamento'), label: 'Novo comportamento', weight: 10 }],
    }
    onChange([...stages, newStage])
  }

  function updateBehaviorLabel(stageIdx: number, behaviorIdx: number, label: string) {
    onChange(
      stages.map((s, i) =>
        i === stageIdx
          ? { ...s, behaviors: s.behaviors.map((b, j) => (j === behaviorIdx ? { ...b, label } : b)) }
          : s,
      ),
    )
  }

  function updateBehaviorWeight(stageIdx: number, behaviorIdx: number, raw: string) {
    const weight = Math.max(1, parseInt(raw) || 1)
    onChange(
      stages.map((s, i) =>
        i === stageIdx
          ? { ...s, behaviors: s.behaviors.map((b, j) => (j === behaviorIdx ? { ...b, weight } : b)) }
          : s,
      ),
    )
  }

  function deleteBehavior(stageIdx: number, behaviorIdx: number) {
    const stage = stages[stageIdx]
    if (!stage || stage.behaviors.length <= 1) return
    onChange(
      stages.map((s, i) =>
        i === stageIdx ? { ...s, behaviors: s.behaviors.filter((_, j) => j !== behaviorIdx) } : s,
      ),
    )
  }

  function addBehavior(stageIdx: number) {
    onChange(
      stages.map((s, i) =>
        i === stageIdx
          ? { ...s, behaviors: [...s.behaviors, { key: randKey('comportamento'), label: 'Novo comportamento', weight: 10 }] }
          : s,
      ),
    )
  }

  const total = calcTotal(stages)

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-2.5 text-left">Etapa / Comportamento</th>
            <th className="w-28 px-4 py-2.5 text-right">Peso</th>
            <th className="w-10 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {stages.map((stage, si) => (
            <Fragment key={stage.key}>
              {/* Stage row */}
              <tr className="bg-neutral-50">
                <td className="px-4 py-2" colSpan={2}>
                  <input
                    value={stage.label}
                    onChange={(e) => updateStageLabel(si, e.target.value)}
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-neutral-700 focus:border-neutral-300 focus:bg-white focus:outline-none"
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => deleteStage(si)}
                    disabled={stages.length <= 1}
                    title="Remover etapa"
                    className="text-neutral-300 hover:text-red-500 disabled:opacity-20"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>

              {/* Behavior rows */}
              {stage.behaviors.map((b, bi) => (
                <tr key={b.key}>
                  <td className="px-4 py-1.5 pl-8">
                    <input
                      value={b.label}
                      onChange={(e) => updateBehaviorLabel(si, bi, e.target.value)}
                      className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-neutral-600 focus:border-neutral-300 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    <input
                      type="number"
                      min={1}
                      value={b.weight}
                      onChange={(e) => updateBehaviorWeight(si, bi, e.target.value)}
                      className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-sm tabular-nums text-neutral-500 focus:border-neutral-300 focus:bg-white focus:outline-none"
                    />
                    <span className="ml-0.5 text-xs text-neutral-400">pts</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => deleteBehavior(si, bi)}
                      disabled={stage.behaviors.length <= 1}
                      title="Remover comportamento"
                      className="text-neutral-300 hover:text-red-500 disabled:opacity-20"
                    >
                      <X className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Add behavior */}
              <tr>
                <td colSpan={3} className="px-4 py-1 pl-8">
                  <button
                    type="button"
                    onClick={() => addBehavior(si)}
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700"
                  >
                    <Plus className="size-3" />
                    Comportamento
                  </button>
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
        <tfoot className="border-t border-neutral-200 bg-neutral-50">
          <tr>
            <td className="px-4 py-2">
              <button
                type="button"
                onClick={addStage}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700"
              >
                <Plus className="size-3.5" />
                Nova etapa
              </button>
            </td>
            <td className="px-4 py-2 text-right text-xs font-bold tabular-nums text-neutral-700">
              {total} pts total
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CriteriaManagerSection({ companyId, activeCriteria }: Props) {
  const router = useRouter()
  const [showAiParser, setShowAiParser] = useState(false)
  const [aiText, setAiText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<{ stages: Stage[]; total_points: number; name: string } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Editor inline de etapas
  const [isEditing, setIsEditing] = useState(false)
  const [editableStages, setEditableStages] = useState<Stage[]>(activeCriteria?.stages ?? [])
  const [saveError, setSaveError] = useState<string | null>(null)

  // Doc slots — 4 dimensões fixas
  const [salesProcessDoc, setSalesProcessDoc] = useState<DocSlotValue>({
    file_path: activeCriteria?.sales_process_file_path ?? null,
    extracted_text: activeCriteria?.sales_process_text ?? null,
  })
  const [styleAlignmentDoc, setStyleAlignmentDoc] = useState<DocSlotValue>({
    file_path: activeCriteria?.style_alignment_file_path ?? null,
    extracted_text: activeCriteria?.style_alignment_text ?? null,
  })
  const [resultAdherenceDoc, setResultAdherenceDoc] = useState<DocSlotValue>({
    file_path: activeCriteria?.result_adherence_file_path ?? null,
    extracted_text: activeCriteria?.result_adherence_text ?? null,
  })
  const [competenciesDoc, setCompetenciesDoc] = useState<DocSlotValue>({
    file_path: activeCriteria?.competencies_file_path ?? null,
    extracted_text: activeCriteria?.competencies_text ?? null,
  })

  // Critérios customizados modulares
  const [customCriteria, setCustomCriteria] = useState<CustomCriterion[]>(
    parseCustomCriteria(activeCriteria?.custom_criteria),
  )
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newCustomName, setNewCustomName] = useState('')
  const [newCustomText, setNewCustomText] = useState('')
  const [savingCustom, setSavingCustom] = useState(false)

  // ─── Stage editor handlers ───────────────────────────────────────────────────

  function startEditing() {
    setEditableStages(activeCriteria?.stages ?? [])
    setSaveError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setEditableStages(activeCriteria?.stages ?? [])
    setSaveError(null)
    setIsEditing(false)
  }

  function saveStages() {
    if (!activeCriteria) return
    const total = calcTotal(editableStages)
    setSaveError(null)
    startTransition(async () => {
      try {
        await updateEvaluationCriteria({
          id: activeCriteria.id,
          name: activeCriteria.name,
          stages: editableStages,
          total_points: total,
        })
        setSaved(true)
        setIsEditing(false)
        setTimeout(() => setSaved(false), 3000)
        router.refresh()
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  // ─── AI parser handlers ──────────────────────────────────────────────────────

  async function handleFileUpload(file: File) {
    setIsExtracting(true)
    setParseError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/knowledge/extract-text', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erro ao extrair texto.')
      }
      const data = await res.json() as { text: string; truncated: boolean }
      setAiText(data.text)
      setUploadedFileName(file.name)
      if (data.truncated) setParseError('Arquivo muito longo — texto truncado em 150.000 caracteres.')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erro ao processar arquivo.')
    } finally {
      setIsExtracting(false)
    }
  }

  async function handleParseAi() {
    if (!aiText.trim()) return
    setIsParsing(true)
    setParseError(null)
    try {
      const res = await fetch('/api/ai/parse-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      })
      if (!res.ok) throw new Error('Erro ao processar texto.')
      const data = await res.json() as { criteria: { stages: Stage[]; total_points: number } }
      setParsed({ ...data.criteria, name: 'Critério customizado' })
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setIsParsing(false)
    }
  }

  function saveParsedCriteria() {
    if (!parsed) return
    startTransition(async () => {
      await createEvaluationCriteria({
        company_id: companyId,
        name: parsed.name,
        stages: parsed.stages,
        total_points: parsed.total_points,
      })
      setSaved(true)
      setShowAiParser(false)
      setAiText('')
      setParsed(null)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    })
  }

  // ─── Custom criteria handlers ────────────────────────────────────────────────

  async function addCustomCriterion() {
    if (!activeCriteria || !newCustomName.trim()) return
    setSavingCustom(true)
    const newItem: CustomCriterion = {
      id: crypto.randomUUID(),
      name: newCustomName.trim(),
      text: newCustomText.trim(),
    }
    const updated = [...customCriteria, newItem]
    try {
      await updateCustomCriteria({ criteria_id: activeCriteria.id, custom_criteria: updated })
      setCustomCriteria(updated)
      setNewCustomName('')
      setNewCustomText('')
      setShowAddCustom(false)
    } finally {
      setSavingCustom(false)
    }
  }

  async function removeCustomCriterion(id: string) {
    if (!activeCriteria) return
    const updated = customCriteria.filter((c) => c.id !== id)
    await updateCustomCriteria({ criteria_id: activeCriteria.id, custom_criteria: updated })
    setCustomCriteria(updated)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {activeCriteria && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-800">{activeCriteria.name}</h3>
              <p className="text-xs text-neutral-500">
                {isEditing ? `${calcTotal(editableStages)} pts total (editando)` : `${activeCriteria.total_points} pts total`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saved && !isEditing && (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle className="size-4" />
                  Salvo
                </span>
              )}
              {!isEditing && !showAiParser && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                >
                  <Pencil className="size-3.5" />
                  Editar etapas
                </button>
              )}
            </div>
          </div>

          {/* Tabela de etapas/comportamentos */}
          {isEditing ? (
            <div className="space-y-2">
              <StagesEditor stages={editableStages} onChange={setEditableStages} />
              {saveError && <p className="text-xs text-red-600">{saveError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveStages}
                  disabled={isPending || editableStages.length === 0}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : 'Salvar etapas'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isPending}
                  className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Etapa / Comportamento</th>
                    <th className="px-4 py-2.5 text-right">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {activeCriteria.stages.map((stage) => (
                    <Fragment key={`stage-${stage.key}`}>
                      <tr className="bg-neutral-50">
                        <td className="px-4 py-2 font-medium text-neutral-700" colSpan={2}>
                          {stage.label}
                        </td>
                      </tr>
                      {stage.behaviors.map((b) => (
                        <tr key={b.key}>
                          <td className="px-4 py-2 pl-8 text-neutral-600">{b.label}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-neutral-500">
                            {b.weight} pts
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4 dimensões de referência fixas */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Dimensões de referência
            </p>
            <p className="text-xs text-neutral-500">
              Faça upload de um PDF por dimensão. A IA extrai o conteúdo e o usa como contexto na avaliação.
            </p>
            <ClientDocSlot
              label="Processo de vendas"
              description="Etapas, metodologia e orientações do processo comercial"
              entityType="criteria"
              entityId={activeCriteria.id}
              field="sales_process"
              value={salesProcessDoc.extracted_text || salesProcessDoc.file_path ? salesProcessDoc : null}
              onUpdate={setSalesProcessDoc}
              analyzeWithAI={false}
            />
            <ClientDocSlot
              label="Adequação ao estilo"
              description="Como o vendedor deve se adaptar ao estilo comportamental do comprador"
              entityType="criteria"
              entityId={activeCriteria.id}
              field="style_alignment"
              value={styleAlignmentDoc.extracted_text || styleAlignmentDoc.file_path ? styleAlignmentDoc : null}
              onUpdate={setStyleAlignmentDoc}
              analyzeWithAI={false}
            />
            <ClientDocSlot
              label="Aderência ao resultado esperado"
              description="Definição do resultado ideal e indicadores de sucesso da negociação"
              entityType="criteria"
              entityId={activeCriteria.id}
              field="result_adherence"
              value={resultAdherenceDoc.extracted_text || resultAdherenceDoc.file_path ? resultAdherenceDoc : null}
              onUpdate={setResultAdherenceDoc}
              analyzeWithAI={false}
            />
            <ClientDocSlot
              label="Aderência às competências"
              description="Competências esperadas e critérios de excelência comportamental"
              entityType="criteria"
              entityId={activeCriteria.id}
              field="competencies"
              value={competenciesDoc.extracted_text || competenciesDoc.file_path ? competenciesDoc : null}
              onUpdate={setCompetenciesDoc}
              analyzeWithAI={false}
            />
          </div>

          {/* Critérios customizados modulares */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Critérios adicionais
              </p>
              <button
                type="button"
                onClick={() => setShowAddCustom(true)}
                className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800"
              >
                <Plus className="size-3.5" />
                Novo critério
              </button>
            </div>

            {customCriteria.length === 0 && !showAddCustom && (
              <p className="text-xs text-neutral-400">
                Adicione critérios customizados além das 4 dimensões padrão.
              </p>
            )}

            {customCriteria.map((criterion) => (
              <div key={criterion.id} className="rounded-md border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-neutral-700">{criterion.name}</p>
                    {criterion.text && (
                      <p className="mt-1 text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                        {criterion.text}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeCustomCriterion(criterion.id)}
                    className="shrink-0 text-neutral-300 hover:text-red-500"
                    aria-label="Remover"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {showAddCustom && (
              <div className="rounded-md border border-neutral-200 p-3 space-y-2">
                <p className="text-xs font-medium text-neutral-600">Novo critério</p>
                <input
                  type="text"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="Nome do critério (ex: Uso de storytelling)"
                  className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
                <textarea
                  value={newCustomText}
                  onChange={(e) => setNewCustomText(e.target.value)}
                  rows={3}
                  placeholder="Descreva o critério: o que é avaliado, como identificar, exemplos..."
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void addCustomCriterion()}
                    disabled={savingCustom || !newCustomName.trim()}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {savingCustom ? 'Salvando...' : 'Adicionar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddCustom(false); setNewCustomName(''); setNewCustomText('') }}
                    className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!activeCriteria && !showAiParser && (
        <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-10 text-center">
          <p className="text-sm text-neutral-500">Nenhum critério de avaliação configurado.</p>
          <p className="mt-1 text-xs text-neutral-400">
            O sistema usará os 6 estágios padrão da Negociarte.
          </p>
        </div>
      )}

      {/* Parser IA para criar/substituir critério */}
      <div>
        {!showAiParser ? (
          <button
            onClick={() => setShowAiParser(true)}
            className="flex items-center gap-2 rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
          >
            <Wand2 className="size-4" />
            {activeCriteria ? 'Substituir critério com IA' : 'Criar critério com IA'}
          </button>
        ) : (
          <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Criar critério a partir do processo de vendas
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Suba um PDF ou TXT, ou cole o texto. A IA extrairá etapas, comportamentos e pesos para avaliação.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFileUpload(file)
                e.target.value = ''
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting || isParsing}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                <Paperclip className="size-3.5" />
                {isExtracting ? 'Extraindo texto...' : 'Carregar PDF ou TXT'}
              </button>
              {uploadedFileName && (
                <span className="flex items-center gap-1 text-xs text-neutral-500">
                  {uploadedFileName}
                  <button
                    type="button"
                    onClick={() => { setUploadedFileName(null); setAiText('') }}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
            </div>

            <textarea
              value={aiText}
              onChange={(e) => { setAiText(e.target.value); if (uploadedFileName) setUploadedFileName(null) }}
              rows={8}
              placeholder="Ou cole o texto do processo de vendas: etapas, comportamentos esperados, critérios de excelência..."
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none resize-none"
            />
            {parseError && <p className="text-xs text-red-600">{parseError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleParseAi}
                disabled={isParsing || isExtracting || !aiText.trim()}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {isParsing ? 'Analisando...' : 'Analisar com IA'}
              </button>
              <button
                onClick={() => { setShowAiParser(false); setAiText(''); setParsed(null); setParseError(null); setUploadedFileName(null) }}
                className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>

            {parsed && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Critério gerado — revise antes de salvar
                </p>
                <div>
                  <label className="mb-1 block text-xs font-medium text-blue-800">Nome do critério</label>
                  <input
                    type="text"
                    value={parsed.name}
                    onChange={(e) => setParsed((p) => p ? { ...p, name: e.target.value } : p)}
                    className="w-full rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div className="overflow-hidden rounded-md border border-blue-200 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-50 text-xs uppercase tracking-wide text-blue-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Etapa / Comportamento</th>
                        <th className="px-3 py-2 text-right">Peso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50">
                      {parsed.stages.map((stage) => (
                        <Fragment key={`pstage-${stage.key}`}>
                          <tr className="bg-blue-50/50">
                            <td className="px-3 py-2 font-medium text-blue-800" colSpan={2}>
                              {stage.label}
                            </td>
                          </tr>
                          {stage.behaviors.map((b) => (
                            <tr key={b.key}>
                              <td className="px-3 py-1.5 pl-6 text-neutral-600">{b.label}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-neutral-500">
                                {b.weight} pts
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-blue-100 bg-blue-50">
                      <tr>
                        <td className="px-3 py-2 text-xs font-semibold text-blue-700">Total</td>
                        <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-blue-700">
                          {parsed.total_points} pts
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveParsedCriteria}
                    disabled={isPending}
                    className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {isPending ? 'Salvando...' : 'Salvar critério'}
                  </button>
                  <button
                    onClick={() => setParsed(null)}
                    className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm hover:bg-blue-50"
                  >
                    Refazer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

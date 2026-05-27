'use client'

import { useState, useTransition } from 'react'
import { createEvaluationCriteria } from '@/lib/actions/evaluation-criteria'
import { Wand2, CheckCircle } from 'lucide-react'

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

interface Criteria {
  id: string
  name: string
  stages: Stage[]
  total_points: number
  is_active: boolean
}

interface Props {
  companyId: string
  activeCriteria: Criteria | null
}

export function CriteriaManagerSection({ companyId, activeCriteria }: Props) {
  const [showAiParser, setShowAiParser] = useState(false)
  const [aiText, setAiText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parsed, setParsed] = useState<{ stages: Stage[]; total_points: number; name: string } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

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

  function saveCriteria() {
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
    })
  }

  return (
    <div className="space-y-6">
      {/* Current active criteria */}
      {activeCriteria && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-800">{activeCriteria.name}</h3>
              <p className="text-xs text-neutral-500">{activeCriteria.total_points} pts total</p>
            </div>
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle className="size-4" />
                Critério atualizado
              </div>
            )}
          </div>
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
                  <>
                    <tr key={`stage-${stage.key}`} className="bg-neutral-50">
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
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!activeCriteria && !showAiParser && (
        <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-10 text-center">
          <p className="text-sm text-neutral-500">
            Nenhum critério de avaliação configurado.
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            O sistema usará os 6 estágios padrão da Negociarte.
          </p>
        </div>
      )}

      {/* AI Parser */}
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
                Cole a descrição do processo de vendas da empresa. A IA extrairá etapas, comportamentos e pesos para avaliação.
              </p>
            </div>
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              rows={8}
              placeholder="Descreva o processo de vendas: etapas, comportamentos esperados em cada etapa, critérios de excelência..."
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none resize-none"
            />
            {parseError && <p className="text-xs text-red-600">{parseError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleParseAi}
                disabled={isParsing || !aiText.trim()}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {isParsing ? 'Analisando...' : 'Analisar com IA'}
              </button>
              <button
                onClick={() => { setShowAiParser(false); setAiText(''); setParsed(null); setParseError(null) }}
                className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>

            {/* Parsed result preview */}
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
                        <>
                          <tr key={`pstage-${stage.key}`} className="bg-blue-50/50">
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
                        </>
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
                    onClick={saveCriteria}
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

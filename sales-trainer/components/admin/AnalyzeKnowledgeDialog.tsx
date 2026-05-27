'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, User, Building2, Brain, CheckSquare, Square, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { updateCompanyContext, createCustomerQuick } from '@/lib/actions/scenario-entities'
import { createBehaviorStyle } from '@/lib/actions/behavior-styles'
import type { KnowledgeAnalysis } from '@/lib/schemas/analyze-knowledge'

interface Props {
  companyId: string
  companyName: string
  activeDocCount: number
}

type DialogState = 'idle' | 'analyzing' | 'review' | 'saving' | 'done' | 'error'

interface CompanyFields {
  description: string
  industry: string
  company_size: string
  product_context: string
  market_situation: string
  competition_context: string
  marketing_strategy: string
}

export function AnalyzeKnowledgeDialog({ companyId, companyName, activeDocCount }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<DialogState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<KnowledgeAnalysis | null>(null)

  // Campos da empresa editáveis
  const [companyFields, setCompanyFields] = useState<CompanyFields>({
    description: '',
    industry: '',
    company_size: '',
    product_context: '',
    market_situation: '',
    competition_context: '',
    marketing_strategy: '',
  })

  // Seleção de clientes e estilos
  const [selectedCustomers, setSelectedCustomers] = useState<boolean[]>([])
  const [selectedStyles, setSelectedStyles] = useState<boolean[]>([])

  // ─── Handlers ────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    setState('analyzing')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/ai/analyze-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      })

      const data: unknown = await res.json()

      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? 'Erro na análise.'
        setState('error')
        setErrorMsg(msg)
        return
      }

      const result = data as KnowledgeAnalysis
      setAnalysis(result)

      // Pré-preencher campos da empresa
      setCompanyFields({
        description: result.company.description,
        industry: result.company.industry,
        company_size: result.company.company_size,
        product_context: result.company.product_context,
        market_situation: result.company.market_situation,
        competition_context: result.company.competition_context,
        marketing_strategy: result.company.marketing_strategy,
      })

      // Por padrão todos selecionados
      setSelectedCustomers(result.customers.map(() => true))
      setSelectedStyles(result.styles.map(() => true))

      setState('review')
    } catch {
      setState('error')
      setErrorMsg('Erro de rede ao analisar documentos.')
    }
  }

  async function handleApply() {
    if (!analysis) return
    setState('saving')

    try {
      const tasks: Promise<unknown>[] = []

      // 1. Atualizar campos da empresa
      tasks.push(updateCompanyContext(companyId, companyFields))

      // 2. Criar clientes selecionados
      analysis.customers.forEach((customer, i) => {
        if (selectedCustomers[i]) {
          tasks.push(
            createCustomerQuick({
              name: customer.name,
              buyer_role: customer.buyer_role,
              description: customer.description,
              pain_points: customer.pain_points,
              objections: customer.objections,
              budget_context: customer.budget_context,
              communication_style: customer.communication_style,
            }),
          )
        }
      })

      // 3. Criar estilos selecionados
      analysis.styles.forEach((style, i) => {
        if (selectedStyles[i]) {
          tasks.push(
            createBehaviorStyle({
              name: style.name,
              description: style.description,
              simulation_guidance: style.simulation_guidance,
              is_active: true,
            }),
          )
        }
      })

      await Promise.all(tasks)
      setState('done')
      router.refresh()
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  function handleClose() {
    setOpen(false)
    // Reset para próxima abertura
    setTimeout(() => {
      setState('idle')
      setAnalysis(null)
      setErrorMsg(null)
    }, 300)
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  function CompanyFieldInput({
    label,
    field,
    multiline = false,
  }: {
    label: string
    field: keyof CompanyFields
    multiline?: boolean
  }) {
    const value = companyFields[field]
    const handleChange = (v: string) =>
      setCompanyFields((prev) => ({ ...prev, [field]: v }))

    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-600">{label}</label>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
        )}
      </div>
    )
  }

  const checkedCustomers = selectedCustomers.filter(Boolean).length
  const checkedStyles = selectedStyles.filter(Boolean).length
  const totalChecked = 1 + checkedCustomers + checkedStyles // empresa sempre incluída

  // ─── Trigger Button ───────────────────────────────────────────────────────

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={activeDocCount === 0}
        title={
          activeDocCount === 0
            ? 'Adicione pelo menos 1 documento ativo para analisar'
            : `Analisar ${activeDocCount} documento${activeDocCount !== 1 ? 's' : ''} com IA`
        }
        className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
      >
        <Sparkles className="size-4" />
        Analisar com IA
      </button>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-violet-600" />
              Análise IA — {companyName}
            </DialogTitle>
            <DialogDescription>
              {state === 'idle' &&
                `A IA vai ler os ${activeDocCount} documento${activeDocCount !== 1 ? 's' : ''} ativos e sugerir dados para empresa, personas de clientes e estilos comportamentais.`}
              {state === 'analyzing' && 'Analisando documentos…'}
              {state === 'review' && 'Revise as sugestões, edite o que precisar e clique em Aplicar.'}
              {state === 'saving' && 'Salvando dados…'}
              {state === 'done' && 'Dados aplicados com sucesso! A página será atualizada.'}
              {state === 'error' && 'Ocorreu um erro durante a análise.'}
            </DialogDescription>
          </DialogHeader>

          {/* ── idle ─────────────────────────────────────────────────────── */}
          {state === 'idle' && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                <p className="font-medium text-neutral-800 mb-1">O que será gerado:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Campos contextuais da empresa (mercado, produtos, estratégia)</li>
                  <li>2–3 personas de clientes B2B com dores e objeções</li>
                  <li>2–3 estilos comportamentais de compradores</li>
                </ul>
                <p className="mt-2 text-xs text-neutral-500">
                  Você poderá revisar e editar tudo antes de salvar.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                >
                  <Sparkles className="size-4" />
                  Iniciar análise
                </button>
              </div>
            </div>
          )}

          {/* ── analyzing ────────────────────────────────────────────────── */}
          {state === 'analyzing' && (
            <div className="mt-8 flex flex-col items-center gap-4 py-8">
              <Loader2 className="size-10 animate-spin text-violet-600" />
              <p className="text-sm text-neutral-500">
                Lendo documentos e extraindo informações…
              </p>
            </div>
          )}

          {/* ── error ────────────────────────────────────────────────────── */}
          {state === 'error' && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2 text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p className="text-sm">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => setState('idle')}
                className="mt-3 text-sm text-red-600 underline hover:no-underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* ── done ─────────────────────────────────────────────────────── */}
          {state === 'done' && (
            <div className="mt-8 flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="size-12 text-green-500" />
              <p className="text-sm font-medium text-neutral-800">Dados aplicados com sucesso!</p>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Fechar
              </button>
            </div>
          )}

          {/* ── review ───────────────────────────────────────────────────── */}
          {(state === 'review' || state === 'saving') && analysis && (
            <div className="mt-4 space-y-6">

              {/* Empresa */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="size-4 text-neutral-600" />
                  <h3 className="text-sm font-semibold text-neutral-800">Empresa</h3>
                  <span className="text-xs text-neutral-400">(sempre aplicado)</span>
                </div>
                <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <CompanyFieldInput label="Setor" field="industry" />
                    <CompanyFieldInput label="Porte" field="company_size" />
                  </div>
                  <CompanyFieldInput label="Descrição" field="description" multiline />
                  <CompanyFieldInput label="Contexto de produtos" field="product_context" multiline />
                  <CompanyFieldInput label="Situação de mercado" field="market_situation" multiline />
                  <CompanyFieldInput label="Concorrência" field="competition_context" multiline />
                  <CompanyFieldInput label="Estratégia de marketing" field="marketing_strategy" multiline />
                </div>
              </section>

              {/* Clientes */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <User className="size-4 text-neutral-600" />
                  <h3 className="text-sm font-semibold text-neutral-800">
                    Personas de clientes
                  </h3>
                  <span className="text-xs text-neutral-400">
                    {checkedCustomers} de {analysis.customers.length} selecionadas
                  </span>
                </div>
                <div className="space-y-2">
                  {analysis.customers.map((customer, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setSelectedCustomers((prev) =>
                          prev.map((v, j) => (j === i ? !v : v)),
                        )
                      }
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedCustomers[i]
                          ? 'border-violet-200 bg-violet-50'
                          : 'border-neutral-200 bg-white opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {selectedCustomers[i] ? (
                          <CheckSquare className="mt-0.5 size-4 shrink-0 text-violet-600" />
                        ) : (
                          <Square className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800">
                            {customer.name}
                            <span className="ml-2 text-xs font-normal text-neutral-500">
                              {customer.buyer_role}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">
                            {customer.description}
                          </p>
                          {customer.pain_points && (
                            <p className="mt-0.5 text-xs text-neutral-400 line-clamp-1">
                              <span className="font-medium">Dores:</span> {customer.pain_points}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Estilos */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Brain className="size-4 text-neutral-600" />
                  <h3 className="text-sm font-semibold text-neutral-800">
                    Estilos de comportamento
                  </h3>
                  <span className="text-xs text-neutral-400">
                    {checkedStyles} de {analysis.styles.length} selecionados
                  </span>
                </div>
                <div className="space-y-2">
                  {analysis.styles.map((style, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setSelectedStyles((prev) =>
                          prev.map((v, j) => (j === i ? !v : v)),
                        )
                      }
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedStyles[i]
                          ? 'border-violet-200 bg-violet-50'
                          : 'border-neutral-200 bg-white opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {selectedStyles[i] ? (
                          <CheckSquare className="mt-0.5 size-4 shrink-0 text-violet-600" />
                        ) : (
                          <Square className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800">{style.name}</p>
                          <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">
                            {style.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
                <p className="text-xs text-neutral-500">
                  {totalChecked} item{totalChecked !== 1 ? 's' : ''} a salvar
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={state === 'saving'}
                    className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApply()}
                    disabled={state === 'saving'}
                    className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {state === 'saving' ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Salvando…
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Aplicar selecionados
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

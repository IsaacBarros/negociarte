'use client'

import { useState, useTransition, useRef } from 'react'
import {
  FileText,
  Link,
  AlignLeft,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Upload,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { toggleKnowledgeDoc, deleteKnowledgeDoc, addTextKnowledgeDoc } from '@/lib/actions/knowledge'
import { AnalyzeKnowledgeDialog } from '@/components/admin/AnalyzeKnowledgeDialog'
import type { Database } from '@/types/database'

type KnowledgeDoc = Database['public']['Tables']['company_knowledge_docs']['Row']

type UploadTab = 'pdf' | 'url' | 'text'

interface PendingCompress {
  docId: string
  title: string
  chars: number
}

interface Props {
  companyId: string
  companyName: string
  initialDocs: KnowledgeDoc[]
  projectProductContext?: string | null
}

const MAX_TEXT_CHARS = 150_000
const COMPRESS_THRESHOLD = 15_000

export function KnowledgeDocList({ companyId, companyName, initialDocs, projectProductContext }: Props) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(initialDocs)
  const [isPending, startTransition] = useTransition()

  // Tab ativa no painel de upload
  const [activeTab, setActiveTab] = useState<UploadTab>('pdf')

  // PDF
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // URL
  const [urlInput, setUrlInput] = useState('')
  const [urlTitle, setUrlTitle] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  // Texto livre
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [textLoading, setTextLoading] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)

  // Compressão IA
  const [pendingCompress, setPendingCompress] = useState<PendingCompress | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [compressError, setCompressError] = useState<string | null>(null)

  // Confirmação de delete inline
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // ─── Handlers de upload ───────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setUploadLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('company_id', companyId)

    try {
      const res = await fetch('/api/knowledge/upload', { method: 'POST', body: formData })
      const data: unknown = await res.json()

      if (!res.ok) {
        const errMsg = (data as { error?: string }).error ?? 'Erro ao fazer upload.'
        setUploadError(errMsg)
        return
      }

      const { doc, truncated, chars } = data as { doc: KnowledgeDoc; truncated: boolean; chars: number }
      setDocs((prev) => [doc, ...prev])

      if (truncated) {
        setUploadError(`Texto truncado em ${(MAX_TEXT_CHARS / 1000).toFixed(0)}k caracteres. Considere usar "Comprimir com IA".`)
      }

      if (chars > COMPRESS_THRESHOLD) {
        setPendingCompress({ docId: doc.id, title: doc.title, chars })
      }
    } catch {
      setUploadError('Erro de rede ao fazer upload.')
    } finally {
      setUploadLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleUrlFetch(e: React.FormEvent) {
    e.preventDefault()
    if (!urlInput.trim()) return

    setUrlError(null)
    setUrlLoading(true)

    try {
      const res = await fetch('/api/knowledge/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          url: urlInput.trim(),
          title: urlTitle.trim() || undefined,
        }),
      })
      const data: unknown = await res.json()

      if (!res.ok) {
        const errMsg = (data as { error?: string }).error ?? 'Erro ao buscar URL.'
        setUrlError(errMsg)
        return
      }

      const { doc, truncated, chars } = data as { doc: KnowledgeDoc; truncated: boolean; chars: number }
      setDocs((prev) => [doc, ...prev])
      setUrlInput('')
      setUrlTitle('')

      if (truncated) {
        setUrlError(`Conteúdo truncado em ${(MAX_TEXT_CHARS / 1000).toFixed(0)}k caracteres.`)
      }

      if (chars > COMPRESS_THRESHOLD) {
        setPendingCompress({ docId: doc.id, title: doc.title, chars })
      }
    } catch {
      setUrlError('Erro de rede ao buscar URL.')
    } finally {
      setUrlLoading(false)
    }
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!textTitle.trim() || !textContent.trim()) return

    setTextError(null)
    setTextLoading(true)

    try {
      const result = await addTextKnowledgeDoc({
        company_id: companyId,
        title: textTitle.trim(),
        text: textContent.trim(),
      })
      setDocs((prev) => [result.doc, ...prev])
      setTextTitle('')
      setTextContent('')

      if (textContent.trim().length > COMPRESS_THRESHOLD) {
        setPendingCompress({
          docId: result.doc.id,
          title: result.doc.title,
          chars: textContent.trim().length,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar documento.'
      setTextError(msg)
    } finally {
      setTextLoading(false)
    }
  }

  // ─── Handler de compressão IA ─────────────────────────────────────────────

  async function handleCompress() {
    if (!pendingCompress) return

    setCompressing(true)
    setCompressError(null)

    try {
      const res = await fetch('/api/knowledge/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: pendingCompress.docId }),
      })
      const data: unknown = await res.json()

      if (!res.ok) {
        const errMsg = (data as { error?: string }).error ?? 'Erro na compressão.'
        setCompressError(errMsg)
        return
      }

      const { chars } = data as { chars: number; original_chars: number }

      // Atualiza o tamanho do doc no estado local (texto comprimido já está no banco)
      // Usa placeholder de comprimento correto — não precisamos do texto real na UI, só do length
      setDocs((prev) =>
        prev.map((d) =>
          d.id === pendingCompress.docId
            ? { ...d, extracted_text: '~'.repeat(chars) }
            : d,
        ),
      )
      setPendingCompress(null)
    } catch {
      setCompressError('Erro de rede durante compressão.')
    } finally {
      setCompressing(false)
    }
  }

  // ─── Handlers de lista ────────────────────────────────────────────────────

  function handleToggle(docId: string, newActive: boolean) {
    startTransition(async () => {
      await toggleKnowledgeDoc({ doc_id: docId, is_active: newActive })
      setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, is_active: newActive } : d)))
    })
  }

  function handleDeleteConfirm(docId: string) {
    if (pendingCompress?.docId === docId) setPendingCompress(null)
    setPendingDeleteId(null)
    startTransition(async () => {
      await deleteKnowledgeDoc({ doc_id: docId })
      setDocs((prev) => prev.filter((d) => d.id !== docId))
    })
  }

  // ─── Métricas de uso ──────────────────────────────────────────────────────

  const totalChars = docs
    .filter((d) => d.is_active)
    .reduce((acc, d) => acc + (d.extracted_text?.length ?? 0), 0)
  const isNearLimit = totalChars > 100_000

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Indicador de uso */}
      {docs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span>
            {docs.filter((d) => d.is_active).length} doc
            {docs.filter((d) => d.is_active).length !== 1 ? 's' : ''} ativo
            {docs.filter((d) => d.is_active).length !== 1 ? 's' : ''}
          </span>
          <span>·</span>
          <span className={isNearLimit ? 'text-amber-600 font-medium' : ''}>
            {(totalChars / 1000).toFixed(0)}k chars injetados no prompt
          </span>
          {isNearLimit && (
            <span className="text-amber-600">⚠ próximo do limite de 150k</span>
          )}
        </div>
      )}

      {/* Painel de upload com abas */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        {/* Abas */}
        <div className="flex border-b border-neutral-200">
          {(
            [
              { key: 'pdf', label: '📄 PDF' },
              { key: 'url', label: '🔗 Link' },
              { key: 'text', label: '📝 Texto' },
            ] as { key: UploadTab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-b-2 border-neutral-900 text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Aba PDF */}
          {activeTab === 'pdf' && (
            <div>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => void handleFileUpload(e)}
                  disabled={uploadLoading}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  <Upload className="size-4" />
                  {uploadLoading ? 'Processando…' : 'Selecionar PDF'}
                </button>
                <span className="text-xs text-neutral-400">Máximo 4MB · até 150k chars extraídos</span>
              </div>
              {uploadError && (
                <div className="mt-2 flex items-start gap-1.5 text-sm text-amber-700">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* Aba URL */}
          {activeTab === 'url' && (
            <form onSubmit={(e) => void handleUrlFetch(e)} className="space-y-2">
              <input
                type="url"
                placeholder="https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={urlLoading}
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-50"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Título (opcional)"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  disabled={urlLoading}
                  className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={urlLoading || !urlInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  {urlLoading ? 'Buscando…' : 'Adicionar'}
                </button>
              </div>
              {urlError && (
                <div className="flex items-start gap-1.5 text-sm text-amber-700">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  {urlError}
                </div>
              )}
            </form>
          )}

          {/* Aba Texto */}
          {activeTab === 'text' && (
            <form onSubmit={(e) => void handleTextSubmit(e)} className="space-y-2">
              <input
                type="text"
                placeholder="Título do documento"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                disabled={textLoading}
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-50"
              />
              <textarea
                placeholder="Cole ou digite o conteúdo aqui…"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                disabled={textLoading}
                rows={6}
                maxLength={MAX_TEXT_CHARS}
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-50 resize-y"
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs ${textContent.length > MAX_TEXT_CHARS * 0.9 ? 'text-amber-600' : 'text-neutral-400'}`}>
                  {textContent.length.toLocaleString('pt-BR')} / {MAX_TEXT_CHARS.toLocaleString('pt-BR')} chars
                </span>
                <button
                  type="submit"
                  disabled={textLoading || !textTitle.trim() || !textContent.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  {textLoading ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
              {textError && (
                <div className="flex items-start gap-1.5 text-sm text-red-600">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  {textError}
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Banner de compressão IA */}
      {pendingCompress && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">
                &ldquo;{pendingCompress.title}&rdquo; é grande (
                {(pendingCompress.chars / 1000).toFixed(0)}k chars)
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Documentos grandes consomem mais contexto do agente. A IA pode extrair os insights
                mais relevantes para vendas em ~5k chars.
              </p>
              {compressError && (
                <p className="mt-1 text-xs text-red-600">{compressError}</p>
              )}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void handleCompress()}
              disabled={compressing}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <Sparkles className="size-3.5" />
              {compressing ? 'Comprimindo…' : 'Comprimir com IA (~5k chars)'}
            </button>
            <button
              type="button"
              onClick={() => setPendingCompress(null)}
              disabled={compressing}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              Manter assim
            </button>
          </div>
        </div>
      )}

      {/* Lista de documentos */}
      {docs.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Nenhum documento adicionado ainda. Suba um PDF, adicione um link ou cole um texto acima.
        </p>
      ) : (
        <>
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3"
            >
              {doc.source_type === 'pdf' ? (
                <FileText className="size-4 shrink-0 text-red-400" />
              ) : doc.source_type === 'url' ? (
                <Link className="size-4 shrink-0 text-blue-400" />
              ) : (
                <AlignLeft className="size-4 shrink-0 text-green-500" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-medium ${
                    !doc.is_active ? 'text-neutral-400' : 'text-neutral-800'
                  }`}
                >
                  {doc.title}
                </p>
                <p className="text-xs text-neutral-400">
                  {doc.source_type.toUpperCase()}
                  {doc.extracted_text
                    ? ` · ${(doc.extracted_text.length / 1000).toFixed(0)}k chars`
                    : ''}
                  {!doc.is_active && ' · desativado'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {pendingDeleteId === doc.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-600">Remover?</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteConfirm(doc.id)}
                      disabled={isPending}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(null)}
                      className="rounded px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleToggle(doc.id, !doc.is_active)}
                      disabled={isPending}
                      title={doc.is_active ? 'Desativar' : 'Ativar'}
                      className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
                    >
                      {doc.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(doc.id)}
                      disabled={isPending}
                      title="Remover"
                      className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Botão de análise IA — aparece quando há docs */}
        <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-violet-900">Base de conhecimento pronta</p>
            <p className="text-xs text-violet-600">
              Deixe a IA ler os documentos e sugerir dados para a empresa, personas e estilos.
            </p>
          </div>
          <AnalyzeKnowledgeDialog
            companyId={companyId}
            companyName={companyName}
            activeDocCount={docs.filter((d) => d.is_active).length}
            projectProductContext={projectProductContext}
          />
        </div>
        </>
      )}
    </div>
  )
}

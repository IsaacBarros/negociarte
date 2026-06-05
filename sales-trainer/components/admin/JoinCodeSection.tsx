'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import QRCode from 'qrcode'
import { regenerateJoinCode } from '@/lib/actions/project-members'

interface JoinCodeSectionProps {
  companyId: string
  initialCode: string
}

export function JoinCodeSection({ companyId, initialCode }: JoinCodeSectionProps) {
  const [code, setCode] = useState(initialCode)
  const [copied, setCopied] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrSvg, setQrSvg] = useState('')
  const [qrForLink, setQrForLink] = useState('')
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const origin = useSyncExternalStore(subscribeNoop, getBrowserOrigin, getServerOrigin)

  const joinLink = `${origin}/join/${code}`

  function handleCopy() {
    void navigator.clipboard.writeText(joinLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateJoinCode({ company_id: companyId })
      setCode(result.join_code)
      setShowConfirm(false)
      setQrSvg('')
      setQrForLink('')
    })
  }

  async function handleOpenQrCode() {
    setShowQrModal(true)
    setQrError(null)

    if (qrSvg && qrForLink === joinLink) return

    setIsGeneratingQr(true)
    try {
      const svg = await QRCode.toString(joinLink, {
        type: 'svg',
        width: 720,
        margin: 2,
        color: {
          dark: '#111827',
          light: '#ffffff',
        },
      })
      setQrSvg(svg)
      setQrForLink(joinLink)
    } catch (err) {
      console.error(err)
      setQrError('Não foi possível gerar o QR Code.')
    } finally {
      setIsGeneratingQr(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Link visível */}
      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
        <span className="flex-1 truncate font-mono text-xs text-neutral-600">{joinLink}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
        >
          {copied ? '✓ Copiado' : 'Copiar link'}
        </button>
        <button
          type="button"
          onClick={handleOpenQrCode}
          className="shrink-0 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-700"
        >
          QR Code
        </button>
      </div>

      {/* Regenerar */}
      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="text-xs text-neutral-400 underline hover:text-neutral-600"
        >
          Gerar novo link
        </button>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="mb-2 text-xs text-amber-800">
            ⚠️ O link atual deixará de funcionar. Todos os vendedores já vinculados continuam
            com acesso — só novos links precisarão do código novo.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isPending}
              className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {isPending ? 'Gerando...' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 px-4 py-8 backdrop-blur-sm">
          <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  QR Code de acesso
                </p>
                <h3 className="mt-1 text-xl font-semibold text-neutral-900">
                  Link do vendedor
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Exiba esta tela em uma sala para os vendedores acessarem o projeto pelo celular.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                Fechar
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 p-6">
                {isGeneratingQr && (
                  <p className="text-sm text-neutral-500">Gerando QR Code...</p>
                )}
                {qrError && !isGeneratingQr && (
                  <p className="text-sm text-red-600">{qrError}</p>
                )}
                {qrSvg && !isGeneratingQr && !qrError && (
                  <div
                    className="w-full max-w-[min(64vh,620px)]"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Link
                  </p>
                  <p className="mt-2 break-all rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-relaxed text-neutral-600">
                    {joinLink}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {copied ? 'Copiado' : 'Copiar link'}
                </button>
                <p className="text-xs leading-relaxed text-neutral-500">
                  O QR Code usa o mesmo link de convite. Se você gerar um novo link, este QR Code
                  também muda.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function subscribeNoop() {
  return () => undefined
}

function getBrowserOrigin() {
  return window.location.origin
}

function getServerOrigin() {
  return ''
}

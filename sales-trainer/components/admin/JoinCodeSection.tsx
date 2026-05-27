'use client'

import { useState, useTransition } from 'react'
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

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://app.negociarte.com'

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
    })
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
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2 } from 'lucide-react'
import { createCompanyQuick } from '@/lib/actions/scenario-entities'
import { KnowledgeDocList } from '@/components/admin/KnowledgeDocList'

type Phase = 'name' | 'setup'

export function NewCompanyFlow() {
  const [phase, setPhase] = useState<Phase>('name')
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await createCompanyQuick({ name: name.trim() })
        setCompany(result)
        setPhase('setup')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar projeto.')
      }
    })
  }

  if (phase === 'name') {
    return (
      <form onSubmit={handleCreate} className="space-y-4 max-w-sm">
        <div>
          <label htmlFor="company-name" className="block text-sm font-medium text-neutral-700 mb-1">
            Nome do projeto
          </label>
          <input
            id="company-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Distribuidora ABC"
            disabled={isPending}
            autoFocus
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-50"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {isPending ? 'Criando…' : 'Criar projeto'}
          {!isPending && <ArrowRight className="size-4" />}
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-8">
      {/* Confirmação de criação + CTA para gerenciamento completo */}
      <div className="flex items-start justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Building2 className="size-5 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-900">
              Projeto &ldquo;{company!.name}&rdquo; criado
            </p>
            <p className="text-xs text-green-700">
              Adicione documentos abaixo para enriquecer a simulação com IA.
            </p>
          </div>
        </div>
        <Link
          href={`/admin/companies/${company!.id}`}
          className="ml-4 shrink-0 text-xs font-medium text-green-700 underline underline-offset-2 hover:text-green-900"
        >
          Gerenciamento completo →
        </Link>
      </div>

      {/* Base de conhecimento inline */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-neutral-700">Base de conhecimento</h2>
        <p className="mb-4 text-xs text-neutral-500">
          Suba PDFs, adicione links ou cole textos. A IA pode analisar e preencher
          automaticamente os campos do projeto.
        </p>
        <KnowledgeDocList
          companyId={company!.id}
          companyName={company!.name}
          initialDocs={[]}
        />
      </section>
    </div>
  )
}

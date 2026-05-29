'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Save, Plus, BookOpen } from 'lucide-react'
import { setSellerCustomerHistory } from '@/lib/actions/seller-companies'
import { CreateScenarioDialog } from '@/components/admin/CreateScenarioDialog'

interface Seller {
  id: string
  full_name: string | null
  email: string
}

interface History {
  seller_id: string
  history_text: string
}

interface Profile {
  id: string
  name: string
  buyer_role: string | null
  customer_id: string | null
  scenario_type: string | null
  difficulty_level: string | null
  histories: History[]
}

interface Props {
  companyId: string
  projectProductContext?: string | null
  profiles: Profile[]
  sellers: Seller[]
}

const scenarioTypeLabel: Record<string, string> = {
  discovery: 'Descoberta',
  objection_handling: 'Objeções',
  closing: 'Fechamento',
}

const difficultyLabel: Record<string, { label: string; color: string }> = {
  easy: { label: 'Fácil', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Médio', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: 'Difícil', color: 'bg-red-100 text-red-700' },
  trainee_choice: { label: 'Aluno escolhe', color: 'bg-neutral-100 text-neutral-600' },
}

function HistoryRow({
  sellerId,
  customerId,
  initialText,
}: {
  sellerId: string
  customerId: string
  initialText: string
}) {
  const [text, setText] = useState(initialText)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function save() {
    startTransition(async () => {
      await setSellerCustomerHistory({
        seller_id: sellerId,
        customer_id: customerId,
        history_text: text,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setSaved(false)
        }}
        rows={3}
        maxLength={3000}
        placeholder="Histórico de relacionamento deste vendedor com o cliente..."
        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none resize-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">{text.length}/3000</span>
        <button
          onClick={save}
          disabled={isPending || !text.trim()}
          className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          <Save className="size-3" />
          {saved ? 'Salvo!' : isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

function ScenarioCard({ profile, sellers }: { profile: Profile; sellers: Seller[] }) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const difficulty = profile.difficulty_level
    ? difficultyLabel[profile.difficulty_level]
    : undefined
  const typeLabel = profile.scenario_type ? scenarioTypeLabel[profile.scenario_type] : null

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-start justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-800">{profile.name}</p>
          {profile.buyer_role && (
            <p className="mt-0.5 text-xs text-neutral-500">{profile.buyer_role}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {typeLabel && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {typeLabel}
              </span>
            )}
            {difficulty && (
              <span className={['rounded-full px-2 py-0.5 text-xs', difficulty.color].join(' ')}>
                {difficulty.label}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/admin/profiles/${profile.id}`}
          className="ml-4 shrink-0 rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
        >
          Editar
        </Link>
      </div>

      {profile.customer_id && sellers.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex w-full items-center justify-between border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500 hover:text-neutral-700"
          >
            <span>Histórico por vendedor</span>
            {historyOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
          {historyOpen && (
            <div className="space-y-4 border-t border-neutral-100 px-4 pb-4 pt-3">
              {sellers.map((seller) => {
                const existing = profile.histories.find((h) => h.seller_id === seller.id)
                return (
                  <div key={seller.id}>
                    <p className="mb-1.5 text-xs font-medium text-neutral-600">
                      {seller.full_name ?? seller.email}
                    </p>
                    <HistoryRow
                      sellerId={seller.id}
                      customerId={profile.customer_id!}
                      initialText={existing?.history_text ?? ''}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function ScenariosSection({ companyId, projectProductContext, profiles, sellers }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-700">Cenários de venda</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Cada cenário representa uma oportunidade de venda B2B que os vendedores podem praticar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus className="size-4" />
          Novo cenário
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-200 py-12 text-center">
          <BookOpen className="size-8 text-neutral-300" />
          <p className="text-sm text-neutral-500">Nenhum cenário criado ainda.</p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="text-sm font-medium text-violet-600 hover:underline"
          >
            Criar primeiro cenário
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <ScenarioCard key={profile.id} profile={profile} sellers={sellers} />
          ))}
        </div>
      )}

      <CreateScenarioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={companyId}
        projectProductContext={projectProductContext}
      />
    </>
  )
}

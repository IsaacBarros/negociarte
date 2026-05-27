'use client'

import { useState, useTransition } from 'react'
import { setSellerCustomerHistory } from '@/lib/actions/seller-companies'
import { ChevronDown, ChevronUp, Save } from 'lucide-react'

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
  histories: History[]
}

interface Props {
  profiles: Profile[]
  sellers: Seller[]
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
      await setSellerCustomerHistory({ seller_id: sellerId, customer_id: customerId, history_text: text })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false) }}
        rows={3}
        maxLength={3000}
        placeholder="Descreva o histórico de relacionamento deste vendedor com o cliente..."
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

function ProfileRow({ profile, sellers }: { profile: Profile; sellers: Seller[] }) {
  const [open, setOpen] = useState(false)

  if (!profile.customer_id) return null

  return (
    <div className="rounded-lg border border-neutral-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-medium text-neutral-800">{profile.name}</p>
          {profile.buyer_role && (
            <p className="text-xs text-neutral-400">{profile.buyer_role}</p>
          )}
        </div>
        {open ? (
          <ChevronUp className="size-4 text-neutral-400" />
        ) : (
          <ChevronDown className="size-4 text-neutral-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-4 pb-4 pt-3 space-y-4">
          {sellers.length === 0 && (
            <p className="text-xs text-neutral-400">Nenhum vendedor vinculado à empresa.</p>
          )}
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
    </div>
  )
}

export function CustomerHistorySection({ profiles, sellers }: Props) {
  if (profiles.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Nenhum cenário de cliente criado para esta empresa.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <ProfileRow key={profile.id} profile={profile} sellers={sellers} />
      ))}
    </div>
  )
}

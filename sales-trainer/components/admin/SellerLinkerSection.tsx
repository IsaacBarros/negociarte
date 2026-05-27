'use client'

import { useTransition } from 'react'
import { linkSellerToCompany, unlinkSellerFromCompany } from '@/lib/actions/seller-companies'
import { Check, Plus, X } from 'lucide-react'

interface Seller {
  id: string
  full_name: string | null
  email: string
}

interface Props {
  companyId: string
  sellers: Seller[]
  linkedSellerIds: string[]
}

export function SellerLinkerSection({ companyId, sellers, linkedSellerIds }: Props) {
  const [isPending, startTransition] = useTransition()

  function toggle(sellerId: string, isLinked: boolean) {
    startTransition(async () => {
      if (isLinked) {
        await unlinkSellerFromCompany({ seller_id: sellerId, company_id: companyId })
      } else {
        await linkSellerToCompany({ seller_id: sellerId, company_id: companyId })
      }
    })
  }

  if (sellers.length === 0) {
    return (
      <p className="text-sm text-neutral-400">Nenhum vendedor cadastrado na organização.</p>
    )
  }

  return (
    <div className="space-y-2">
      {sellers.map((seller) => {
        const isLinked = linkedSellerIds.includes(seller.id)
        return (
          <div
            key={seller.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-neutral-800">
                {seller.full_name ?? seller.email}
              </p>
              <p className="text-xs text-neutral-400">{seller.email}</p>
            </div>
            <button
              onClick={() => toggle(seller.id, isLinked)}
              disabled={isPending}
              className={[
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                isLinked
                  ? 'bg-neutral-900 text-white hover:bg-neutral-700'
                  : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400',
              ].join(' ')}
            >
              {isLinked ? (
                <>
                  <Check className="size-3" />
                  Vinculado
                </>
              ) : (
                <>
                  <Plus className="size-3" />
                  Vincular
                </>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

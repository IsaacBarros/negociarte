import { JoinCodeSection } from '@/components/admin/JoinCodeSection'
import { SellerLinkerSection } from '@/components/admin/SellerLinkerSection'

interface Seller {
  id: string
  full_name: string | null
  email: string
}

interface Props {
  companyId: string
  joinCode: string
  sellers: Seller[]
  linkedSellerIds: string[]
}

export function AccessSection({ companyId, joinCode, sellers, linkedSellerIds }: Props) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-sm font-semibold text-neutral-700">Link de acesso do vendedor</h2>
        <p className="mb-4 text-xs text-neutral-500">
          Envie este link para os vendedores. Ao acessar, eles são automaticamente vinculados ao
          projeto e podem começar a treinar.
        </p>
        <JoinCodeSection companyId={companyId} initialCode={joinCode} />
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-neutral-700">Vendedores com acesso</h2>
        <p className="mb-4 text-xs text-neutral-500">
          Vendedores vinculados por link ou adicionados manualmente aqui.
        </p>
        <SellerLinkerSection
          companyId={companyId}
          sellers={sellers}
          linkedSellerIds={linkedSellerIds}
        />
      </section>
    </div>
  )
}

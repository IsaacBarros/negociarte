'use client'

import { useRouter } from 'next/navigation'

interface Company {
  id: string
  name: string
}

interface Props {
  companies: Company[]
  selectedId: string | null
}

export function CompanyFilter({ companies, selectedId }: Props) {
  const router = useRouter()

  if (companies.length === 0) return null

  return (
    <select
      value={selectedId ?? ''}
      onChange={(e) => {
        const val = e.target.value
        router.push(val ? `/admin/profiles?company=${val}` : '/admin/profiles')
      }}
      className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none focus:border-neutral-900"
      aria-label="Filtrar por projeto"
    >
      <option value="">Todos os projetos</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}

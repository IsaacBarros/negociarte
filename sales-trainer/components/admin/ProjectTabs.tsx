import Link from 'next/link'

const TABS = [
  { key: 'context', label: 'Contexto' },
  { key: 'clients', label: 'Clientes' },
  { key: 'styles', label: 'Estilos' },
  { key: 'criteria', label: 'Critérios' },
  { key: 'scenarios', label: 'Cenários' },
  { key: 'access', label: 'Acesso' },
] as const

interface Props {
  companyId: string
  activeTab: string
}

export function ProjectTabs({ companyId, activeTab }: Props) {
  return (
    <div className="flex gap-1 border-b border-neutral-200">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <Link
            key={tab.key}
            href={`/admin/companies/${companyId}?tab=${tab.key}`}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

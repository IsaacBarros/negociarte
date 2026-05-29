'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'

type Profile = {
  id: string
  full_name: string | null
  email: string
  role: 'admin' | 'seller'
  organization_id: string
}

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  const isAdmin = profile.role === 'admin'

  const navItems = isAdmin
    ? [{ href: '/train', label: 'Treinar' }]
    : [
        { href: '/train', label: 'Treinar' },
        { href: '/train/history', label: 'Meu progresso' },
      ]

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-neutral-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-neutral-200 px-4">
        <span className="font-semibold tracking-tight">Negociarte</span>
      </div>

      {/* Action button */}
      <div className="px-3 py-3">
        {isAdmin ? (
          <Link
            href="/admin/companies/new"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            <span>+</span> Novo projeto
          </Link>
        ) : (
          <Link
            href="/train"
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
          >
            + Nova sessão
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        {isAdmin && (
          <div className="space-y-0.5">
            <Link
              href="/admin/companies"
              className={`flex items-center rounded-md px-3 py-1.5 text-sm ${
                pathname.startsWith('/admin/companies')
                  ? 'bg-neutral-100 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Projetos
            </Link>
            <div className="ml-3 border-l border-neutral-200 pl-2">
              {[
                { href: '/admin/sessions', label: 'Sessões' },
                { href: '/admin/analytics', label: 'Analytics' },
              ].map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-md px-3 py-1.5 text-sm ${
                      active
                        ? 'bg-neutral-100 font-medium'
                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-1.5 text-sm ${
                active ? 'bg-neutral-100 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-200 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium uppercase">
            {(profile.full_name ?? profile.email).charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {profile.full_name ?? profile.email}
            </p>
            <p className="text-xs text-neutral-400 capitalize">{profile.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-neutral-400 hover:text-neutral-900"
            title="Sair"
          >
            Sair
          </button>
        </div>
      </div>
    </aside>
  )
}

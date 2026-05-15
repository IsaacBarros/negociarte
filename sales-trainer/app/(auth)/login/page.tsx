import { LoginForm } from './login-form'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Entrar — Negociarte',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>
}) {
  const { error, reason } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profileRaw as { role: string } | null)?.role

    if (role === 'admin') redirect('/admin/profiles')
    if (role) redirect('/train')

    if (profileError && error !== 'missing_profile') {
      redirect(`/login?error=missing_profile&reason=${encodeURIComponent(profileError.code)}`)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Negociarte</h1>
          <p className="mt-1 text-sm text-neutral-500">Entre na sua conta para continuar</p>
        </div>
        {error === 'missing_profile' && (
          <div className="mb-4 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Sua autenticação está ativa, mas o perfil do usuário ainda não foi criado.
            {process.env.NODE_ENV === 'development' && reason && (
              <span className="mt-1 block text-xs">Código: {reason}</span>
            )}
          </div>
        )}
        <LoginForm />
      </div>
    </main>
  )
}

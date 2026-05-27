/**
 * Página pública de entrada para vendedores.
 * Acessível sem autenticação (rota adicionada às publicRoutes do middleware).
 *
 * Estados:
 * - Não autenticado  → mostra JoinAuthForm (login / criar conta)
 * - Autenticado      → executa a vinculação ao projeto + mostra boas-vindas
 * - Código inválido  → mostra erro
 */
import { createClient } from '@/lib/supabase/server'
import { joinProjectByCode } from '@/lib/actions/project-members'
import { JoinAuthForm } from '@/components/join/JoinAuthForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Acessar projeto — Negociarte' }

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()

  // Verifica autenticação sem redirecionar (diferente de requireAuth)
  const { data: { user } } = await supabase.auth.getUser()

  // ── Não autenticado: mostra formulário de login/cadastro ─────────────────
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Negociarte
            </p>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Acesse o projeto de treino
            </h1>
            <p className="text-sm text-neutral-500">
              Entre com sua conta ou crie uma nova para começar.
            </p>
          </div>

          <JoinAuthForm joinCode={code} />
        </div>
      </main>
    )
  }

  // ── Autenticado: executa vinculação ───────────────────────────────────────
  const result = await joinProjectByCode({ code })

  if (!result.success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg className="h-7 w-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Link inválido</h1>
          <p className="text-sm text-neutral-500">
            Este link de acesso não existe ou o projeto foi desativado.
            Solicite um novo link ao seu gestor.
          </p>
          <a
            href="/train"
            className="inline-block rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Ir para o treino
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Ícone de sucesso */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Acesso liberado
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">Bem-vindo ao projeto</h1>
          <p className="text-lg font-medium text-neutral-700">{result.company_name}</p>
        </div>

        <p className="text-sm text-neutral-500">
          Você está vinculado a este projeto e pode começar a treinar agora.
        </p>

        <a
          href="/train"
          className="block w-full rounded-lg bg-neutral-900 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Acessar meu treino
        </a>
      </div>
    </main>
  )
}

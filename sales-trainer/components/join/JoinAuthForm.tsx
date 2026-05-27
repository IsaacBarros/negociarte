'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'login' | 'register'

interface Props {
  joinCode: string
}

export function JoinAuthForm({ joinCode }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')

  // ── Login ──────────────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setLoginError(data.error ?? 'E-mail ou senha inválidos.')
      setLoginLoading(false)
      return
    }

    // Após login, recarrega a join page (agora autenticado) para executar a vinculação
    router.replace(`/join/${joinCode}`)
    router.refresh()
  }

  // ── Cadastro ───────────────────────────────────────────────────────────────
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegLoading(true)
    setRegError(null)

    const res = await fetch('/api/auth/signup-seller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: regName,
        email: regEmail,
        password: regPassword,
        joinCode,
      }),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setRegError(data.error ?? 'Erro ao criar conta.')
      setRegLoading(false)
      return
    }

    // Cadastro + login feitos — recarrega a join page como autenticado
    router.replace(`/join/${joinCode}`)
    router.refresh()
  }

  const inputClass =
    'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
  const labelClass = 'block text-sm font-medium text-neutral-700'

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      {/* Abas */}
      <div className="flex border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setTab('login')}
          className={[
            'flex-1 py-3 text-sm font-medium transition-colors',
            tab === 'login'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-600',
          ].join(' ')}
        >
          Já tenho conta
        </button>
        <button
          type="button"
          onClick={() => setTab('register')}
          className={[
            'flex-1 py-3 text-sm font-medium transition-colors',
            tab === 'register'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-600',
          ].join(' ')}
        >
          Criar conta
        </button>
      </div>

      <div className="p-6">
        {/* ── Login ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {loginError}
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="login-email" className={labelClass}>E-mail</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={inputClass}
                placeholder="voce@empresa.com"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="login-password" className={labelClass}>Senha</label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {loginLoading ? 'Entrando...' : 'Entrar e acessar projeto'}
            </button>
          </form>
        )}

        {/* ── Cadastro ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            {regError && (
              <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {regError}
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="reg-name" className={labelClass}>Seu nome</label>
              <input
                id="reg-name"
                type="text"
                required
                autoComplete="name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className={inputClass}
                placeholder="Nome Sobrenome"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="reg-email" className={labelClass}>E-mail</label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className={inputClass}
                placeholder="voce@empresa.com"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="reg-password" className={labelClass}>Senha</label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className={inputClass}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <button
              type="submit"
              disabled={regLoading}
              className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {regLoading ? 'Criando conta...' : 'Criar conta e acessar projeto'}
            </button>
            <p className="text-center text-xs text-neutral-400">
              Ao criar sua conta você aceita os termos de uso da plataforma.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

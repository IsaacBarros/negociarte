import { SignupForm } from './signup-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Criar conta — Negociarte',
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Negociarte</h1>
          <p className="mt-1 text-sm text-neutral-500">Crie sua conta e organize</p>
        </div>
        <SignupForm />
      </div>
    </main>
  )
}

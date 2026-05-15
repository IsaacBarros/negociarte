'use client'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <h1 className="text-xl font-semibold text-neutral-900">Algo deu errado</h1>
      <p className="mt-2 text-sm text-neutral-500">{error.message}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
      >
        Tentar novamente
      </button>
    </main>
  )
}

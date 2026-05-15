import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold text-neutral-900">404</h1>
      <p className="mt-2 text-neutral-500">Página não encontrada.</p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
      >
        Voltar ao início
      </Link>
    </main>
  )
}

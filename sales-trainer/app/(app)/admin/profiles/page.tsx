import Link from 'next/link'
import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { toggleProfileActive } from '@/lib/actions/profiles'
import type { Metadata } from 'next'
import type { Database } from '@/types/database'

export const metadata: Metadata = { title: 'Cenários — Negociarte' }

type Profile = Database['public']['Tables']['customer_profiles']['Row']

const difficultyLabel: Record<string, string> = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }
const scenarioLabel: Record<string, string> = {
  discovery: 'Discovery',
  objection_handling: 'Objeções',
  closing: 'Fechamento',
}
const modelLabel: Record<string, string> = {
  'x-ai/grok-4.3': 'Grok 4.3',
  'google/gemini-3.1-flash-lite': 'Gemini Flash',
}

export default async function AdminProfilesPage() {
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('customer_profiles')
    .select('id, name, description, difficulty_level, is_active, scenario_type, chat_model, buyer_role, industry, created_at')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  const typedProfiles = (profiles ?? []) as Pick<
    Profile,
    'id' | 'name' | 'description' | 'difficulty_level' | 'is_active' | 'scenario_type' | 'chat_model' | 'buyer_role' | 'industry' | 'created_at'
  >[]

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cenários</h1>
        <Link
          href="/admin/profiles/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          + Novo cenário
        </Link>
      </div>

      {!typedProfiles.length && (
        <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-sm text-neutral-500">Nenhum cenário criado ainda.</p>
          <Link
            href="/admin/profiles/new"
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Criar primeiro cenário
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {typedProfiles.map((p) => (
          <div
            key={p.id}
            className="flex items-start gap-4 rounded-lg border border-neutral-200 p-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/profiles/${p.id}`}
                  className="font-medium hover:underline truncate"
                >
                  {p.name}
                </Link>
                {!p.is_active && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                    Inativo
                  </span>
                )}
                {p.difficulty_level && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                    {difficultyLabel[p.difficulty_level] ?? p.difficulty_level}
                  </span>
                )}
                {p.scenario_type && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                    {scenarioLabel[p.scenario_type] ?? p.scenario_type}
                  </span>
                )}
                {p.chat_model && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                    {modelLabel[p.chat_model] ?? p.chat_model}
                  </span>
                )}
              </div>
              {(p.buyer_role ?? p.industry ?? p.description) && (
                <p className="mt-1 text-xs text-neutral-400 truncate">
                  {[p.buyer_role, p.industry].filter(Boolean).join(' · ') || p.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/admin/profiles/${p.id}`}
                className="text-sm text-neutral-500 hover:text-neutral-900"
              >
                Editar
              </Link>
              <form action={toggleProfileActive.bind(null, p.id, !p.is_active)}>
                <button type="submit" className="text-sm text-neutral-400 hover:text-neutral-700">
                  {p.is_active ? 'Desativar' : 'Ativar'}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

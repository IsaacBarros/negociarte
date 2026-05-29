import { requireAdmin } from '@/lib/actions/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { ScenarioTypesSection } from '@/components/admin/ScenarioTypesSection'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Configurações — Negociarte' }

export default async function SettingsPage() {
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: scenarioTypes } = await supabase
    .from('scenario_types')
    .select('id, key, label, description, sort_order, is_active, created_at')
    .eq('organization_id', user.organization_id)
    .order('sort_order', { ascending: true })

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-1 text-lg font-semibold text-neutral-900">Configurações</h1>
      <p className="mb-8 text-sm text-neutral-500">Personalizações da organização.</p>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800">Tipos de cenário</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Define os tipos disponíveis ao criar cenários. Sem tipos configurados, o sistema usa
            os 3 padrões (Descoberta, Contorno de objeções, Fechamento). A descrição é injetada
            no prompt de geração — seja específico sobre o foco da simulação.
          </p>
        </div>
        <ScenarioTypesSection initialTypes={(scenarioTypes ?? []) as {
          id: string
          key: string
          label: string
          description: string
          sort_order: number
          is_active: boolean
          created_at: string
        }[]} />
      </section>
    </div>
  )
}

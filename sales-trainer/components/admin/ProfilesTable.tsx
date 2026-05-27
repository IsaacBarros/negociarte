'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Archive, Trash2 } from 'lucide-react'
import { toggleProfileActive, archiveProfilesAsAdmin, deleteProfilesAsAdmin } from '@/lib/actions/profiles'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const difficultyLabel: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  trainee_choice: 'Escolha do vendedor',
}
const scenarioLabel: Record<string, string> = {
  discovery: 'Discovery',
  objection_handling: 'Objeções',
  closing: 'Fechamento',
}
const modelLabel: Record<string, string> = {
  'x-ai/grok-4.3': 'Grok 4.3',
  'google/gemini-3.1-flash-lite': 'Gemini Flash',
}

interface ProfileRow {
  id: string
  name: string
  description: string | null
  difficulty_level: string | null
  is_active: boolean
  scenario_type: string | null
  chat_model: string | null
  buyer_role: string | null
  industry: string | null
}

interface Props {
  profiles: ProfileRow[]
  /** profileId → número de sessões associadas */
  sessionCounts: Record<string, number>
}

export function ProfilesTable({ profiles, sessionCounts }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const selectAllRef = useRef<HTMLInputElement>(null)

  const allSelected = profiles.length > 0 && selectedIds.size === profiles.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < profiles.length

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  function toggleAll() {
    if (allSelected || someSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(profiles.map((p) => p.id)))
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalAffectedSessions = [...selectedIds].reduce(
    (sum, id) => sum + (sessionCounts[id] ?? 0),
    0,
  )

  function handleArchive() {
    startTransition(async () => {
      try {
        await archiveProfilesAsAdmin({ profile_ids: [...selectedIds] })
        setSelectedIds(new Set())
      } catch (err) {
        console.error('[archiveProfilesAsAdmin]', err)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteProfilesAsAdmin({ profile_ids: [...selectedIds] })
        setSelectedIds(new Set())
      } catch (err) {
        console.error('[deleteProfilesAsAdmin]', err)
      } finally {
        setConfirmDeleteOpen(false)
      }
    })
  }

  if (!profiles.length) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-16 text-center">
        <p className="text-sm text-neutral-500">Nenhum cenário criado ainda.</p>
        <Link
          href="/admin/profiles/new"
          className="mt-3 inline-block text-sm font-medium underline"
        >
          Criar primeiro cenário
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Header com select all */}
      <div className="mb-1 flex items-center gap-3 px-1 py-2">
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="size-4 cursor-pointer rounded border-neutral-300 accent-neutral-900"
          aria-label="Selecionar todos os cenários"
        />
        <span className="text-xs text-neutral-400">
          {selectedIds.size > 0
            ? `${selectedIds.size} de ${profiles.length} selecionado(s)`
            : `${profiles.length} cenário(s)`}
        </span>
      </div>

      {/* Lista de cenários */}
      <div className="space-y-3">
        {profiles.map((p) => {
          const isSelected = selectedIds.has(p.id)

          return (
            <div
              key={p.id}
              className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                isSelected ? 'border-neutral-400 bg-neutral-50' : 'border-neutral-200'
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOne(p.id)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-neutral-300 accent-neutral-900"
                aria-label={`Selecionar cenário ${p.name}`}
              />

              {/* Conteúdo */}
              <div className="flex flex-1 min-w-0 items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
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

                {/* Ações individuais */}
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
            </div>
          )
        })}
      </div>

      {/* Barra de ação flutuante */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 shadow-lg">
          <span className="text-sm text-neutral-700">
            {selectedIds.size} cenário(s) selecionado(s)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleArchive}
          >
            <Archive />
            Arquivar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 />
            Excluir permanentemente
          </Button>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Excluir cenários?</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Serão excluídos{' '}
              <strong>{selectedIds.size}</strong>{' '}
              {selectedIds.size === 1 ? 'cenário' : 'cenários'}.
              {totalAffectedSessions > 0 && (
                <>
                  {' '}
                  <br />
                  <span className="mt-1 block text-amber-700">
                    Atenção: também serão apagadas{' '}
                    <strong>{totalAffectedSessions}</strong>{' '}
                    {totalAffectedSessions === 1 ? 'sessão associada' : 'sessões associadas'},
                    incluindo todas as mensagens e feedbacks.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

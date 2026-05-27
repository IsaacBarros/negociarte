'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { deleteSessionsAsAdmin } from '@/lib/actions/sessions'
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

const statusLabel: Record<string, string> = {
  active: 'Em andamento',
  completed: 'Concluída',
  abandoned: 'Abandonada',
}

const statusColor: Record<string, string> = {
  active: 'text-green-600',
  completed: 'text-neutral-600',
  abandoned: 'text-neutral-400',
}

interface SessionRow {
  id: string
  title: string | null
  status: string
  started_at: string
  ended_at: string | null
  total_tokens: number
  seller_id: string
  customer_profile_id: string
}

interface SellerInfo {
  id: string
  full_name: string | null
  email: string
}

interface ProfileInfo {
  id: string
  name: string
}

interface FeedbackInfo {
  session_id: string
  overall_score: number | null
}

interface Props {
  sessions: SessionRow[]
  sellers: SellerInfo[]
  profiles: ProfileInfo[]
  feedbacks: FeedbackInfo[]
}

export function SessionsTable({ sessions, sellers, profiles, feedbacks }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const selectAllRef = useRef<HTMLInputElement>(null)

  const sellersMap = new Map(sellers.map((s) => [s.id, s]))
  const profilesMap = new Map(profiles.map((p) => [p.id, p]))
  const feedbackMap = new Map(feedbacks.map((f) => [f.session_id, f.overall_score]))

  const allSelected = sessions.length > 0 && selectedIds.size === sessions.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < sessions.length

  // Controla estado indeterminate do checkbox "select all"
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  function toggleAll() {
    if (allSelected || someSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sessions.map((s) => s.id)))
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

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSessionsAsAdmin({ session_ids: [...selectedIds] })
        setSelectedIds(new Set())
      } catch (err) {
        console.error('[deleteSessionsAsAdmin]', err)
      } finally {
        setConfirmOpen(false)
      }
    })
  }

  if (!sessions.length) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-16 text-center">
        <p className="text-sm text-neutral-500">Nenhuma sessão encontrada.</p>
      </div>
    )
  }

  return (
    <>
      {/* Header com select all */}
      <div className="mb-1 flex items-center gap-3 px-4 py-2">
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="size-4 cursor-pointer rounded border-neutral-300 accent-neutral-900"
          aria-label="Selecionar todas as sessões"
        />
        <span className="text-xs text-neutral-400">
          {selectedIds.size > 0
            ? `${selectedIds.size} de ${sessions.length} selecionada(s)`
            : `${sessions.length} sessão(ões)`}
        </span>
      </div>

      {/* Lista de sessões */}
      <div className="space-y-2">
        {sessions.map((s) => {
          const seller = sellersMap.get(s.seller_id)
          const profile = profilesMap.get(s.customer_profile_id)
          const score = feedbackMap.get(s.id)
          const isSelected = selectedIds.has(s.id)

          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                isSelected ? 'border-neutral-400 bg-neutral-50' : 'border-neutral-200'
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOne(s.id)}
                className="size-4 shrink-0 cursor-pointer rounded border-neutral-300 accent-neutral-900"
                aria-label={`Selecionar sessão ${s.title ?? profile?.name ?? s.id}`}
              />

              {/* Link para detalhes */}
              <Link
                href={`/admin/sessions/${s.id}`}
                className="flex flex-1 min-w-0 items-center gap-4 hover:opacity-80"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {s.title ?? profile?.name ?? '—'}
                    </p>
                    <span className={`shrink-0 text-xs ${statusColor[s.status] ?? ''}`}>
                      {statusLabel[s.status] ?? s.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {seller?.full_name ?? seller?.email ?? '—'} ·{' '}
                    {new Date(s.started_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  {score !== undefined && score !== null && (
                    <div>
                      <p className="text-xs text-neutral-400">Nota</p>
                      <p className="text-sm font-semibold">{score}/10</p>
                    </div>
                  )}
                  {s.total_tokens > 0 && (
                    <div>
                      <p className="text-xs text-neutral-400">Tokens</p>
                      <p className="text-sm">{s.total_tokens.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Barra de ação flutuante */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 shadow-lg">
          <span className="text-sm text-neutral-700">
            {selectedIds.size} sessão(ões) selecionada(s)
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 />
            Excluir
          </Button>
        </div>
      )}

      {/* Dialog de confirmação */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Excluir sessões?</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Serão excluídas{' '}
              <strong>{selectedIds.size}</strong>{' '}
              {selectedIds.size === 1 ? 'sessão' : 'sessões'}, incluindo todas as
              mensagens e feedbacks associados.
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

'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteCompanyAsAdmin } from '@/lib/actions/scenario-entities'
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

interface Props {
  companyId: string
  companyName: string
  profileCount: number
  sessionCount: number
}

export function DeleteCompanyButton({ companyId, companyName, profileCount, sessionCount }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCompanyAsAdmin(companyId)
      } catch (err) {
        console.error('[deleteCompanyAsAdmin]', err)
      } finally {
        setOpen(false)
      }
    })
  }

  const hasImpact = profileCount > 0 || sessionCount > 0

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="mr-1.5 size-3.5" />
        Excluir projeto
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Excluir projeto?</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. O projeto{' '}
              <strong>{companyName}</strong> será excluído permanentemente.
              {hasImpact && (
                <>
                  <br />
                  <span className="mt-1 block text-amber-700">
                    Atenção: também serão excluídos{' '}
                    {profileCount > 0 && (
                      <>
                        <strong>{profileCount}</strong>{' '}
                        {profileCount === 1 ? 'cenário' : 'cenários'}
                      </>
                    )}
                    {profileCount > 0 && sessionCount > 0 && ' e '}
                    {sessionCount > 0 && (
                      <>
                        <strong>{sessionCount}</strong>{' '}
                        {sessionCount === 1 ? 'sessão associada' : 'sessões associadas'}
                      </>
                    )}
                    , incluindo todas as mensagens e feedbacks.
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

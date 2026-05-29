'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClientForProject } from '@/lib/actions/scenario-entities'
import { ClientDocSlot, type DocSlotValue } from './ClientDocSlot'
import { SELECTABLE_CHAT_MODELS } from '@/lib/ai/models'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (client: { id: string; name: string }) => void
}

type State = 'idle' | 'saving' | 'docs' | 'done' | 'error'

interface DocState {
  business_profile: DocSlotValue | null
  pain_objections: DocSlotValue | null
  relationship_history: DocSlotValue | null
}

export function CreateClientDialog({ companyId, open, onOpenChange, onCreated }: Props) {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [buyerRole, setBuyerRole] = useState('')
  const [chatModel, setChatModel] = useState<string | null>(null)
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)
  const [docs, setDocs] = useState<DocState>({
    business_profile: null,
    pain_objections: null,
    relationship_history: null,
  })

  const canSave = name.trim().length > 0 && companyName.trim().length > 0

  function reset() {
    setState('idle')
    setName('')
    setCompanyName('')
    setBuyerRole('')
    setChatModel(null)
    setCreatedClientId(null)
    setDocs({ business_profile: null, pain_objections: null, relationship_history: null })
    setErrorMsg('')
  }

  function handleClose() {
    if (state === 'docs' || state === 'done') {
      router.refresh()
    }
    reset()
    onOpenChange(false)
  }

  function handleCreate() {
    startTransition(async () => {
      setState('saving')
      try {
        const result = await createClientForProject({
          company_id: companyId,
          name: name.trim(),
          company_name: companyName.trim(),
          buyer_role: buyerRole.trim() || undefined,
          chat_model: chatModel,
        })
        setCreatedClientId(result.id)
        onCreated?.(result)
        setState('docs')
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado')
        setState('error')
      }
    })
  }

  function updateDoc(field: keyof DocState, value: DocSlotValue) {
    setDocs((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false} className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {state === 'docs' || state === 'done' ? 'Adicionar documentos' : 'Novo cliente'}
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-700"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>
        </DialogHeader>

        {(state === 'idle' || state === 'saving' || state === 'error') && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  Nome do contato <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  Empresa que representa <span className="text-red-500">*</span>
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Acme Corp"
                  className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">Cargo</label>
                <input
                  value={buyerRole}
                  onChange={(e) => setBuyerRole(e.target.value)}
                  placeholder="Ex: Diretor de TI"
                  className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-700">Modelo de IA</label>
                <select
                  value={chatModel ?? ''}
                  onChange={(e) => setChatModel(e.target.value || null)}
                  className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                >
                  {SELECTABLE_CHAT_MODELS.map((m) => (
                    <option key={m.modelId ?? '__default__'} value={m.modelId ?? ''}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="mt-0.5 text-xs text-neutral-400">
                  Modelo usado em todas as simulações deste cliente.
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-400">
              Após criar, você poderá carregar PDFs de contexto do cliente.
            </p>

            {state === 'error' && (
              <p className="text-xs text-red-600">{errorMsg}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!canSave || isPending}
                onClick={handleCreate}
              >
                {isPending ? 'Criando…' : 'Criar cliente'}
              </Button>
            </div>
          </div>
        )}

        {state === 'docs' && createdClientId && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-neutral-500">
              Cliente criado. Faça upload dos documentos de contexto (opcional — pode ser feito depois).
            </p>

            <ClientDocSlot
              label="Perfil do negócio"
              description="Apresentação da empresa, produtos, mercado-alvo"
              entityType="customer"
              entityId={createdClientId}
              field="business_profile"
              value={docs.business_profile}
              onUpdate={(v) => updateDoc('business_profile', v)}
            />
            <ClientDocSlot
              label="Dores e objeções"
              description="Problemas recorrentes, resistências, objeções típicas"
              entityType="customer"
              entityId={createdClientId}
              field="pain_objections"
              value={docs.pain_objections}
              onUpdate={(v) => updateDoc('pain_objections', v)}
            />
            <ClientDocSlot
              label="Histórico de relacionamento"
              description="Interações anteriores, acordos, contexto de relacionamento"
              entityType="customer"
              entityId={createdClientId}
              field="relationship_history"
              value={docs.relationship_history}
              onUpdate={(v) => updateDoc('relationship_history', v)}
            />

            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={handleClose}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

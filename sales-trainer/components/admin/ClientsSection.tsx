'use client'

import { useState, useTransition } from 'react'
import { FileText, Trash2 } from 'lucide-react'
import { deleteClientForProject, updateClientChatModel } from '@/lib/actions/scenario-entities'
import { CreateClientDialog } from './CreateClientDialog'
import { ClientDocSlot, type DocSlotValue } from './ClientDocSlot'
import { Button } from '@/components/ui/button'
import { SELECTABLE_CHAT_MODELS } from '@/lib/ai/models'

interface ClientRow {
  id: string
  name: string
  company_name: string | null
  buyer_role: string | null
  chat_model: string | null
  business_profile_text: string | null
  business_profile_file_path: string | null
  pain_objections_text: string | null
  pain_objections_file_path: string | null
  relationship_history_text: string | null
  relationship_history_file_path: string | null
}

interface Props {
  companyId: string
  initialClients: ClientRow[]
}

export function ClientsSection({ companyId, initialClients }: Props) {
  const [clients, setClients] = useState(initialClients)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreated(client: { id: string; name: string }) {
    setClients((prev) => [
      ...prev,
      {
        id: client.id,
        name: client.name,
        company_name: null,
        buyer_role: null,
        chat_model: null,
        business_profile_text: null,
        business_profile_file_path: null,
        pain_objections_text: null,
        pain_objections_file_path: null,
        relationship_history_text: null,
        relationship_history_file_path: null,
      },
    ])
    setExpandedId(client.id)
  }

  function updateClientDoc(clientId: string, field: string, value: DocSlotValue) {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              [`${field}_text`]: value.extracted_text,
              [`${field}_file_path`]: value.file_path,
            }
          : c,
      ),
    )
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteClientForProject(id, companyId)
      setClients((prev) => prev.filter((c) => c.id !== id))
      setPendingDeleteId(null)
    })
  }

  function docIndicator(text: string | null) {
    return text ? (
      <FileText className="size-3.5 text-green-500" />
    ) : (
      <div className="size-3.5 rounded-full border border-neutral-300" />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">
            {clients.length === 0
              ? 'Nenhum cliente cadastrado.'
              : `${clients.length} cliente(s)`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          + Novo cliente
        </Button>
      </div>

      {clients.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-200 px-6 py-12 text-center">
          <p className="text-sm text-neutral-500">
            Clientes são os compradores que os vendedores vão simular negociar.
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Crie um cliente e faça upload dos documentos de contexto.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {clients.map((client) => {
          const isExpanded = expandedId === client.id
          const isPendingDelete = pendingDeleteId === client.id

          return (
            <div
              key={client.id}
              className="rounded-lg border border-neutral-200 overflow-hidden"
            >
              {/* Header do card */}
              <div
                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-neutral-50"
                onClick={() => setExpandedId(isExpanded ? null : client.id)}
              >
                {/* Doc indicators */}
                <div className="flex items-center gap-1" title="Perfil / Dores / Histórico">
                  {docIndicator(client.business_profile_text)}
                  {docIndicator(client.pain_objections_text)}
                  {docIndicator(client.relationship_history_text)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{client.name}</p>
                  <p className="text-xs text-neutral-400">
                    {client.company_name ?? '—'}
                    {client.buyer_role ? ` · ${client.buyer_role}` : ''}
                    {client.chat_model
                      ? ` · ${SELECTABLE_CHAT_MODELS.find((m) => m.modelId === client.chat_model)?.label ?? client.chat_model}`
                      : ''}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isPendingDelete ? (
                    <>
                      <span className="text-xs text-neutral-500">Remover?</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(client.id) }}
                        disabled={isPending}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        Sim
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteId(null) }}
                        className="text-xs text-neutral-400 hover:underline"
                      >
                        Não
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingDeleteId(client.id) }}
                      className="text-neutral-300 hover:text-red-500"
                      aria-label="Remover cliente"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Área expandida — doc slots */}
              {isExpanded && (
                <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 space-y-4">
                  {/* Modelo de IA */}
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Modelo de IA
                    </p>
                    <select
                      value={client.chat_model ?? ''}
                      onChange={(e) => {
                        const newModel = e.target.value || null
                        setClients((prev) =>
                          prev.map((c) => c.id === client.id ? { ...c, chat_model: newModel } : c)
                        )
                        startTransition(async () => {
                          await updateClientChatModel({
                            customer_id: client.id,
                            company_id: companyId,
                            chat_model: newModel,
                          })
                        })
                      }}
                      className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                    >
                      {SELECTABLE_CHAT_MODELS.map((m) => (
                        <option key={m.modelId ?? '__default__'} value={m.modelId ?? ''}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                  <p className="mb-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Documentos de contexto
                  </p>
                  <ClientDocSlot
                    label="Perfil do negócio"
                    description="Apresentação da empresa, produtos, mercado-alvo"
                    entityType="customer"
                    entityId={client.id}
                    field="business_profile"
                    value={
                      client.business_profile_text || client.business_profile_file_path
                        ? { extracted_text: client.business_profile_text, file_path: client.business_profile_file_path }
                        : null
                    }
                    onUpdate={(v) => updateClientDoc(client.id, 'business_profile', v)}
                  />
                  <ClientDocSlot
                    label="Dores e objeções"
                    description="Problemas recorrentes, resistências, objeções típicas"
                    entityType="customer"
                    entityId={client.id}
                    field="pain_objections"
                    value={
                      client.pain_objections_text || client.pain_objections_file_path
                        ? { extracted_text: client.pain_objections_text, file_path: client.pain_objections_file_path }
                        : null
                    }
                    onUpdate={(v) => updateClientDoc(client.id, 'pain_objections', v)}
                  />
                  <ClientDocSlot
                    label="Histórico de relacionamento"
                    description="Interações anteriores, acordos, contexto de relacionamento"
                    entityType="customer"
                    entityId={client.id}
                    field="relationship_history"
                    value={
                      client.relationship_history_text || client.relationship_history_file_path
                        ? { extracted_text: client.relationship_history_text, file_path: client.relationship_history_file_path }
                        : null
                    }
                    onUpdate={(v) => updateClientDoc(client.id, 'relationship_history', v)}
                  />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <CreateClientDialog
        companyId={companyId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}

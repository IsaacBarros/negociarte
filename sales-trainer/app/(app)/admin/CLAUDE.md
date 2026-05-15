# CLAUDE.md — app/(app)/admin/

## Regra crítica

**Toda página e Server Action nesta área DEVE verificar `role === 'admin'` no servidor.**

Nunca confie no middleware sozinho. Use o helper `requireAdmin`:

```ts
// Em Server Components:
import { requireAdmin } from '@/lib/actions/auth-helpers'

export default async function AdminPage() {
  await requireAdmin() // lança redirect se não for admin
  // ...
}

// Em Server Actions:
import { requireAdmin } from '@/lib/actions/auth-helpers'

export async function adminAction() {
  const user = await requireAdmin()
  // ...
}
```

## Estrutura

```
admin/
├── profiles/     # CRUD de perfis de clientes simulados
│   ├── page.tsx  # listagem
│   ├── new/      # criação
│   └── [id]/     # edição
├── sessions/     # auditoria de sessões de treino
│   ├── page.tsx  # lista com filtros
│   └── [id]/     # transcrição + feedback
└── analytics/    # métricas agregadas
```

## Acesso a dados

Admins têm acesso a todos os recursos da organização via RLS. Mas o código ainda deve filtrar por `organization_id` explicitamente quando necessário para clareza — a RLS é a rede de segurança, não a única linha de defesa.

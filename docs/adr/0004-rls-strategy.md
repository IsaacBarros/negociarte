# ADR-0004 — Estratégia de Row Level Security (RLS)

**Status:** Aceito  
**Data:** 2026-05-14

## Contexto

A plataforma é multi-tenant (múltiplas organizações no mesmo banco) com dois papéis distintos (admin e seller). Precisamos garantir isolamento total de dados entre organizações e controle de acesso por papel, sem depender apenas de código de aplicação.

## Decisão

**RLS habilitada em todas as tabelas, sem exceção.** O isolamento multi-tenant é garantido em nível de banco — um bug no frontend ou na aplicação não pode vazar dados entre organizações.

### Regra geral

Toda query é filtrada por `organization_id` via policy. O código de aplicação não precisa adicionar `.eq('organization_id', orgId)` manualmente — a policy já faz isso.

### Políticas por tabela

**`profiles`**
- SELECT: usuário lê o próprio registro (`id = auth.uid()`); admins leem todos da org
- UPDATE: usuário atualiza o próprio registro; admins atualizam todos da org
- INSERT/DELETE: apenas via service role (criação via trigger, exclusão é cascade)

**`customer_profiles`**
- SELECT: membros da org com `is_active = true`; admins veem todos (incluindo inativos)
- INSERT/UPDATE/DELETE: apenas admins da org (`role = 'admin'`)

**`training_sessions`**
- SELECT: seller vê as próprias sessões; admins veem todas da org
- INSERT: sellers (criam para si próprios)
- UPDATE: sellers atualizam o próprio `status`; admins atualizam qualquer sessão da org
- DELETE: nunca (soft delete via `status = 'abandoned'`)

**`messages`**
- SELECT: visível se o usuário tem acesso à `session_id` correspondente (JOIN com `training_sessions`)
- INSERT: sellers inserem em sessões próprias; service role para mensagens de IA
- UPDATE/DELETE: nunca (histórico imutável)

**`session_feedback`**
- SELECT: seller dono da sessão + admins da org
- INSERT/UPDATE: apenas via service role (escrito pelo n8n após avaliação)
- DELETE: apenas admins

### Padrão de policy (exemplo)

```sql
-- Sellers veem apenas as próprias sessões
create policy "sellers see own sessions"
on training_sessions for select
using (
  seller_id = auth.uid()
  and organization_id = (
    select organization_id from profiles where id = auth.uid()
  )
);

-- Admins veem todas as sessões da org
create policy "admins see org sessions"
on training_sessions for select
using (
  organization_id = (
    select organization_id from profiles where id = auth.uid()
  )
  and exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);
```

### Service role

O n8n usa a service role key para gravar `session_feedback` — ela bypassa RLS. A key é armazenada nas variáveis de ambiente do n8n e nunca é exposta à aplicação Next.js em produção.

## Alternativas Consideradas

**Filtragem apenas em código de aplicação:** Mais simples inicialmente, mas um único bug no código pode expor dados de outra organização. RLS é defesa em profundidade.

**Policies por schema separado por tenant:** Mais isolamento, mas complexidade operacional muito maior (migrações por tenant, connection pooling complicado). Desnecessário para o volume do MVP.

## Consequências

- **Positivo:** Isolamento garantido em nível de banco — code review não precisa auditar cada query para vazamento de dados.
- **Positivo:** Supabase Auth integra diretamente com RLS via `auth.uid()` — sem código extra de autorização para queries simples.
- **Negativo:** Policies SQL precisam ser testadas e versionadas junto com as migrations. Um erro na policy pode bloquear acesso legítimo.
- **Operacional:** Toda nova tabela deve ter policies definidas antes de ir para produção. Isso está documentado no `CLAUDE.md` raiz como regra proibida (nunca crie tabela sem policy).

## Supersede

Nenhum.

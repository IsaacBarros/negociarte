-- ============================================================
-- 0003_sessions_and_messages.sql
-- Sessões de treino, mensagens e feedback
-- ============================================================

-- Sessões de treino
create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid references customer_profiles on delete restrict not null,
  seller_id uuid references profiles on delete cascade not null,
  organization_id uuid references organizations on delete cascade not null,
  title text,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz default now() not null,
  ended_at timestamptz,
  total_tokens int default 0 not null
);

create index on training_sessions (seller_id, status);
create index on training_sessions (organization_id, status);
create index on training_sessions (customer_profile_id);

-- Mensagens da conversa
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references training_sessions on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tokens int,
  model_used text,
  created_at timestamptz default now() not null
);

create index on messages (session_id, created_at);

-- Feedback gerado ao final da sessão
create table if not exists session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references training_sessions on delete cascade unique not null,
  overall_score int check (overall_score between 1 and 10),
  strengths text,
  improvements text,
  techniques_used text[],
  techniques_missed text[],
  raw_evaluation jsonb,
  model_used text,
  generated_by text default 'ai' not null,
  created_at timestamptz default now() not null
);

-- ============================================================
-- RLS — training_sessions
-- ============================================================

alter table training_sessions enable row level security;

-- Sellers veem as próprias sessões
create policy "sellers see own sessions"
  on training_sessions for select
  using (
    seller_id = auth.uid()
  );

-- Admins veem todas da org
create policy "admins see org sessions"
  on training_sessions for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.organization_id = training_sessions.organization_id
    )
  );

-- Sellers criam as próprias sessões
create policy "sellers insert own sessions"
  on training_sessions for insert
  with check (seller_id = auth.uid());

-- Sellers e admins atualizam status (sellers só das próprias)
create policy "sellers update own sessions"
  on training_sessions for update
  using (seller_id = auth.uid());

create policy "admins update org sessions"
  on training_sessions for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.organization_id = training_sessions.organization_id
    )
  );

-- ============================================================
-- RLS — messages
-- ============================================================

alter table messages enable row level security;

-- Mensagens visíveis a quem tem acesso à sessão
create policy "users see messages of accessible sessions"
  on messages for select
  using (
    exists (
      select 1 from training_sessions ts
      where ts.id = messages.session_id
        and (
          ts.seller_id = auth.uid()
          or exists (
            select 1 from profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
              and p.organization_id = ts.organization_id
          )
        )
    )
  );

-- Sellers inserem mensagens nas próprias sessões
create policy "sellers insert messages"
  on messages for insert
  with check (
    exists (
      select 1 from training_sessions ts
      where ts.id = messages.session_id
        and ts.seller_id = auth.uid()
        and ts.status = 'active'
    )
  );

-- ============================================================
-- RLS — session_feedback
-- ============================================================

alter table session_feedback enable row level security;

-- Seller dono da sessão e admins da org leem o feedback
create policy "users read accessible feedback"
  on session_feedback for select
  using (
    exists (
      select 1 from training_sessions ts
      where ts.id = session_feedback.session_id
        and (
          ts.seller_id = auth.uid()
          or exists (
            select 1 from profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
              and p.organization_id = ts.organization_id
          )
        )
    )
  );

-- Insert e update apenas via service role (n8n escreve o feedback)
-- Nenhuma policy de insert/update — service role bypassa RLS

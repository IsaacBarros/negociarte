-- ============================================================
-- 0001_initial_schema.sql
-- Tabelas base: organizations, profiles
-- ============================================================

-- Organizações (multi-tenant)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now() not null
);

-- Perfil de usuário da aplicação (espelha auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  organization_id uuid references organizations on delete cascade not null,
  email text not null,
  full_name text,
  role text not null check (role in ('admin', 'seller')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Trigger: atualiza updated_at automaticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- Trigger: cria perfil automaticamente ao cadastrar usuário
-- (o admin que convida define role e organization_id)
-- Por ora, deixamos o perfil ser criado manualmente via Server Action de onboarding.

-- ============================================================
-- RLS — profiles
-- ============================================================

alter table organizations enable row level security;
alter table profiles enable row level security;

-- Usuário lê o próprio perfil
create policy "users can read own profile"
  on profiles for select
  using (id = auth.uid());

-- Admins leem todos os perfis da org
create policy "admins read org profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.organization_id = profiles.organization_id
    )
  );

-- Usuário atualiza o próprio perfil
create policy "users can update own profile"
  on profiles for update
  using (id = auth.uid());

-- Admins atualizam perfis da org
create policy "admins update org profiles"
  on profiles for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.organization_id = profiles.organization_id
    )
  );

-- Insert permitido (novo usuário criando próprio perfil no onboarding)
create policy "users can insert own profile"
  on profiles for insert
  with check (id = auth.uid());

-- Organizações: membros leem a própria org
create policy "members read own org"
  on organizations for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = organizations.id
    )
  );

-- Apenas service role cria organizações (via onboarding Server Action)
-- (nenhuma policy de insert — apenas service role bypassa RLS)

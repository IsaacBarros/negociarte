-- ============================================================
-- 0002_customer_profiles.sql
-- Perfis de clientes simulados criados pelos admins
-- ============================================================

create table if not exists customer_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations on delete cascade not null,
  created_by uuid references profiles on delete set null,

  -- Identificação
  name text not null,
  description text,

  -- Placeholders estruturados
  buyer_role text,
  industry text,
  company_size text,
  pain_points text,
  objections text,
  budget_context text,
  decision_authority text,
  personality_traits text,
  communication_style text,
  product_context text,
  scenario_type text,
  difficulty_level text check (difficulty_level in ('easy', 'medium', 'hard')),

  -- System prompt compilado
  system_prompt text not null,

  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger customer_profiles_updated_at
  before update on customer_profiles
  for each row execute function update_updated_at();

create index on customer_profiles (organization_id, is_active);
create index on customer_profiles (created_by);

-- ============================================================
-- RLS — customer_profiles
-- ============================================================

alter table customer_profiles enable row level security;

-- Sellers leem perfis ativos da própria org
create policy "sellers read active profiles"
  on customer_profiles for select
  using (
    is_active = true
    and organization_id = (
      select organization_id from profiles where id = auth.uid()
    )
  );

-- Admins leem todos da org (incluindo inativos)
create policy "admins read all profiles"
  on customer_profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.organization_id = customer_profiles.organization_id
    )
  );

-- Apenas admins criam
create policy "admins insert profiles"
  on customer_profiles for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.organization_id = customer_profiles.organization_id
    )
  );

-- Apenas admins atualizam
create policy "admins update profiles"
  on customer_profiles for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.organization_id = customer_profiles.organization_id
    )
  );

-- Apenas admins deletam
create policy "admins delete profiles"
  on customer_profiles for delete
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.organization_id = customer_profiles.organization_id
    )
  );

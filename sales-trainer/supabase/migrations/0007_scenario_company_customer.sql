-- ============================================================
-- 0007_scenario_company_customer.sql
-- Entidades reutilizaveis para a hierarquia:
-- Cenario -> Empresa + Cliente
-- ============================================================

create table if not exists public.scenario_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade not null,
  created_by uuid references public.profiles on delete set null,
  name text not null,
  description text,
  industry text,
  company_size text,
  product_context text,
  market_situation text,
  competition_context text,
  marketing_strategy text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.scenario_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade not null,
  created_by uuid references public.profiles on delete set null,
  name text not null,
  description text,
  buyer_role text,
  pain_points text,
  objections text,
  budget_context text,
  decision_authority text,
  personality_traits text,
  communication_style text,
  confidential_context text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger scenario_companies_updated_at
  before update on public.scenario_companies
  for each row execute function public.update_updated_at();

create trigger scenario_customers_updated_at
  before update on public.scenario_customers
  for each row execute function public.update_updated_at();

create index if not exists scenario_companies_org_active_idx
  on public.scenario_companies (organization_id, is_active);

create index if not exists scenario_customers_org_active_idx
  on public.scenario_customers (organization_id, is_active);

alter table public.customer_profiles
  add column if not exists company_id uuid references public.scenario_companies on delete set null,
  add column if not exists customer_id uuid references public.scenario_customers on delete set null;

create index if not exists customer_profiles_company_idx
  on public.customer_profiles (company_id);

create index if not exists customer_profiles_customer_idx
  on public.customer_profiles (customer_id);

alter table public.scenario_companies enable row level security;
alter table public.scenario_customers enable row level security;

create policy "members read scenario companies"
  on public.scenario_companies for select
  using (organization_id = public.current_user_organization_id());

create policy "admins insert scenario companies"
  on public.scenario_companies for insert
  with check (public.current_user_is_admin(organization_id));

create policy "admins update scenario companies"
  on public.scenario_companies for update
  using (public.current_user_is_admin(organization_id));

create policy "admins delete scenario companies"
  on public.scenario_companies for delete
  using (public.current_user_is_admin(organization_id));

create policy "members read scenario customers"
  on public.scenario_customers for select
  using (organization_id = public.current_user_organization_id());

create policy "admins insert scenario customers"
  on public.scenario_customers for insert
  with check (public.current_user_is_admin(organization_id));

create policy "admins update scenario customers"
  on public.scenario_customers for update
  using (public.current_user_is_admin(organization_id));

create policy "admins delete scenario customers"
  on public.scenario_customers for delete
  using (public.current_user_is_admin(organization_id));

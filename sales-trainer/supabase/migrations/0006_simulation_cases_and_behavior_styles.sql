-- ============================================================
-- 0006_simulation_cases_and_behavior_styles.sql
-- Casos de simulacao, briefing da visita e estilos comportamentais
-- ============================================================

alter table public.customer_profiles
  add column if not exists visible_briefing text,
  add column if not exists visit_objective text,
  add column if not exists success_criteria text,
  add column if not exists confidential_context text,
  add column if not exists sales_process_context text,
  add column if not exists sales_competencies_context text,
  add column if not exists market_situation text,
  add column if not exists competition_context text,
  add column if not exists marketing_strategy text;

create table if not exists public.behavior_styles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade not null,
  name text not null,
  description text not null,
  simulation_guidance text not null,
  evaluation_criteria text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger behavior_styles_updated_at
  before update on public.behavior_styles
  for each row execute function public.update_updated_at();

create index if not exists behavior_styles_organization_active_idx
  on public.behavior_styles (organization_id, is_active);

alter table public.training_sessions
  add column if not exists behavior_style_id uuid references public.behavior_styles on delete set null,
  add column if not exists outcome text check (outcome in ('accepted', 'rejected', 'ended_by_errors'));

alter table public.behavior_styles enable row level security;

drop policy if exists "members read behavior styles" on public.behavior_styles;
drop policy if exists "admins insert behavior styles" on public.behavior_styles;
drop policy if exists "admins update behavior styles" on public.behavior_styles;
drop policy if exists "admins delete behavior styles" on public.behavior_styles;

create policy "members read behavior styles"
  on public.behavior_styles for select
  using (organization_id = public.current_user_organization_id());

create policy "admins insert behavior styles"
  on public.behavior_styles for insert
  with check (public.current_user_is_admin(organization_id));

create policy "admins update behavior styles"
  on public.behavior_styles for update
  using (public.current_user_is_admin(organization_id));

create policy "admins delete behavior styles"
  on public.behavior_styles for delete
  using (public.current_user_is_admin(organization_id));

insert into public.behavior_styles (
  organization_id,
  name,
  description,
  simulation_guidance,
  evaluation_criteria
)
select
  org.id,
  style.name,
  style.description,
  style.simulation_guidance,
  style.evaluation_criteria
from public.organizations org
cross join (
  values
    (
      'Dominante',
      'Cliente direto, objetivo, orientado a resultado e impaciente com rodeios.',
      'Responda de forma direta. Valorize objetividade, dados de impacto e controle. Dificulte a conversa se o vendedor for prolixo, inseguro ou nao conectar a proposta ao resultado da visita.',
      'Avalie se o vendedor foi objetivo, demonstrou seguranca, conectou a proposta a resultados e conduziu proximos passos com firmeza.'
    ),
    (
      'Influente',
      'Cliente sociavel, expressivo, sensivel a relacionamento, reputacao e entusiasmo.',
      'Valorize conexao, energia e visao de beneficio. Dificulte a conversa se o vendedor for frio, excessivamente tecnico ou ignorar o relacionamento.',
      'Avalie se o vendedor criou rapport, comunicou valor de forma envolvente e manteve foco sem perder conexao.'
    ),
    (
      'Estavel',
      'Cliente cauteloso, colaborativo, avesso a risco e interessado em seguranca.',
      'Valorize previsibilidade, suporte e reducao de risco. Dificulte a conversa se o vendedor pressionar demais ou nao explicar impactos da mudanca.',
      'Avalie se o vendedor construiu confianca, reduziu risco percebido e respeitou o ritmo do cliente.'
    ),
    (
      'Analitico',
      'Cliente criterioso, detalhista, orientado a dados, provas e comparativos.',
      'Peça evidencias, numeros e detalhes. Dificulte a conversa se o vendedor fizer afirmacoes vagas, nao souber justificar ROI ou evitar perguntas tecnicas.',
      'Avalie se o vendedor usou dados, respondeu objeções com clareza e estruturou uma argumentacao racional.'
    )
) as style(name, description, simulation_guidance, evaluation_criteria)
where not exists (
  select 1
  from public.behavior_styles existing
  where existing.organization_id = org.id
    and existing.name = style.name
);

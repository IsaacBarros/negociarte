-- ============================================================
-- 0009_competency_scores_and_profile_style.sql
-- Scores por competência no feedback + estilo fixo por perfil
-- ============================================================

-- Scores estruturados por competência na avaliação
alter table public.session_feedback
  add column if not exists competency_scores jsonb default null;

-- Estilo de comportamento fixo opcional por perfil de cliente
-- Quando preenchido, sobrepõe a seleção aleatória ao criar sessão
alter table public.customer_profiles
  add column if not exists behavior_style_id uuid references public.behavior_styles on delete set null;

create index if not exists customer_profiles_behavior_style_idx
  on public.customer_profiles (behavior_style_id);

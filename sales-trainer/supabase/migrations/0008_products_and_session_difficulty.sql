-- ============================================================
-- 0008_products_and_session_difficulty.sql
-- Produtos da empresa e dificuldade escolhida no inicio do treino
-- ============================================================

alter table public.scenario_companies
  add column if not exists products_services jsonb default '[]'::jsonb not null;

alter table public.customer_profiles
  drop constraint if exists customer_profiles_difficulty_level_check;

alter table public.customer_profiles
  add constraint customer_profiles_difficulty_level_check
  check (difficulty_level in ('easy', 'medium', 'hard', 'trainee_choice'));

alter table public.training_sessions
  add column if not exists difficulty_level text
  check (difficulty_level in ('easy', 'medium', 'hard'));

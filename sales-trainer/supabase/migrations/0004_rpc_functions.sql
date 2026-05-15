-- ============================================================
-- 0004_rpc_functions.sql
-- Funções auxiliares expostas via RPC
-- ============================================================

-- Incrementa o total de tokens de uma sessão de forma atômica
-- (chamado ao final de cada stream de resposta da IA)
create or replace function increment_session_tokens(
  p_session_id uuid,
  p_tokens int
)
returns void
language plpgsql
security definer
as $$
begin
  update training_sessions
  set total_tokens = total_tokens + p_tokens
  where id = p_session_id;
end;
$$;

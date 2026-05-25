-- Atualiza o range de overall_score de 1–10 (n8n legado) para 0–200 (framework Negociarte)
alter table session_feedback
  drop constraint if exists session_feedback_overall_score_check;

alter table session_feedback
  add constraint session_feedback_overall_score_check
  check (overall_score between 0 and 200);

-- Migration 0025: novas dimensões de critérios de avaliação
--
-- Adiciona 2 pares de colunas text/file_path para as dimensões
-- "adequação ao estilo" e "aderência ao resultado esperado",
-- alinhadas com as outras 2 já existentes (sales_process + competencies).
--
-- Adiciona custom_criteria JSONB para critérios modulares criados pelo admin.

ALTER TABLE evaluation_criteria
  ADD COLUMN IF NOT EXISTS style_alignment_text       text,
  ADD COLUMN IF NOT EXISTS style_alignment_file_path  text,
  ADD COLUMN IF NOT EXISTS result_adherence_text      text,
  ADD COLUMN IF NOT EXISTS result_adherence_file_path text,
  ADD COLUMN IF NOT EXISTS custom_criteria            jsonb DEFAULT '[]'::jsonb;

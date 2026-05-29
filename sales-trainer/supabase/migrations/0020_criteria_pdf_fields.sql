-- Migration 0020: evaluation_criteria recebe campos PDF de referência

ALTER TABLE evaluation_criteria
  ADD COLUMN sales_process_text text,
  ADD COLUMN sales_process_file_path text,
  ADD COLUMN competencies_text text,
  ADD COLUMN competencies_file_path text;

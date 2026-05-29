-- Migration 0019: scenario_customers vira entidade do projeto
-- Adiciona company_id (escopo por projeto) + 3 pares de campos PDF

ALTER TABLE scenario_customers
  ADD COLUMN company_id uuid REFERENCES scenario_companies(id) ON DELETE CASCADE,
  ADD COLUMN company_name text,
  ADD COLUMN business_profile_text text,
  ADD COLUMN business_profile_file_path text,
  ADD COLUMN pain_objections_text text,
  ADD COLUMN pain_objections_file_path text,
  ADD COLUMN relationship_history_text text,
  ADD COLUMN relationship_history_file_path text;

CREATE INDEX idx_scenario_customers_company
  ON scenario_customers(company_id)
  WHERE company_id IS NOT NULL;

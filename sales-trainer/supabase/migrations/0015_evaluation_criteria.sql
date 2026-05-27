-- Migration 0015: Critérios de avaliação configuráveis por empresa
-- Idempotente: usa IF NOT EXISTS em todos os objetos.
--
-- Schema de `stages` (JSONB):
-- [
--   {
--     "key": "planejamento",
--     "label": "Planejamento",
--     "behaviors": [
--       { "key": "preparacao_apresentacao", "label": "Preparação e Apresentação", "weight": 20 },
--       { "key": "estrategia_abordagem",    "label": "Estratégia de Abordagem",   "weight": 10 }
--     ]
--   }
-- ]

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations ON DELETE CASCADE,
  company_id      uuid        NOT NULL REFERENCES scenario_companies ON DELETE CASCADE,
  name            text        NOT NULL,
  stages          jsonb       NOT NULL,
  total_points    int         NOT NULL DEFAULT 200,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Apenas um critério ativo por empresa (partial unique index)
DROP INDEX IF EXISTS evaluation_criteria_one_active_per_company;
CREATE UNIQUE INDEX evaluation_criteria_one_active_per_company
  ON evaluation_criteria (company_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS evaluation_criteria_org
  ON evaluation_criteria (organization_id);

CREATE INDEX IF NOT EXISTS evaluation_criteria_company_active
  ON evaluation_criteria (company_id, is_active);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS evaluation_criteria_updated_at ON evaluation_criteria;
CREATE TRIGGER evaluation_criteria_updated_at
  BEFORE UPDATE ON evaluation_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read evaluation criteria"    ON evaluation_criteria;
DROP POLICY IF EXISTS "admins insert evaluation criteria"   ON evaluation_criteria;
DROP POLICY IF EXISTS "admins update evaluation criteria"   ON evaluation_criteria;
DROP POLICY IF EXISTS "admins delete evaluation criteria"   ON evaluation_criteria;

CREATE POLICY "members read evaluation criteria"
  ON evaluation_criteria FOR SELECT
  USING (organization_id = current_user_organization_id());

CREATE POLICY "admins insert evaluation criteria"
  ON evaluation_criteria FOR INSERT
  WITH CHECK (current_user_is_admin(organization_id));

CREATE POLICY "admins update evaluation criteria"
  ON evaluation_criteria FOR UPDATE
  USING (current_user_is_admin(organization_id));

CREATE POLICY "admins delete evaluation criteria"
  ON evaluation_criteria FOR DELETE
  USING (current_user_is_admin(organization_id));

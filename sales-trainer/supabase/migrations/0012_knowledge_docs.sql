-- Migration 0012: Base de conhecimento por empresa
-- Idempotente: usa IF NOT EXISTS em todos os objetos.

CREATE TABLE IF NOT EXISTS company_knowledge_docs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations ON DELETE CASCADE,
  company_id       uuid        NOT NULL REFERENCES scenario_companies ON DELETE CASCADE,
  title            text        NOT NULL,
  source_type      text        NOT NULL CHECK (source_type IN ('pdf', 'url', 'text')),
  source_url       text,           -- path no Supabase Storage (PDFs) ou URL externa
  extracted_text   text,           -- texto extraído para injeção no prompt
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_docs_company_active
  ON company_knowledge_docs (company_id, is_active);

CREATE INDEX IF NOT EXISTS knowledge_docs_org
  ON company_knowledge_docs (organization_id);

-- Trigger de updated_at (recria silenciosamente)
DROP TRIGGER IF EXISTS knowledge_docs_updated_at ON company_knowledge_docs;
CREATE TRIGGER knowledge_docs_updated_at
  BEFORE UPDATE ON company_knowledge_docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE company_knowledge_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can read knowledge docs"   ON company_knowledge_docs;
DROP POLICY IF EXISTS "admins can insert knowledge docs"  ON company_knowledge_docs;
DROP POLICY IF EXISTS "admins can update knowledge docs"  ON company_knowledge_docs;
DROP POLICY IF EXISTS "admins can delete knowledge docs"  ON company_knowledge_docs;

CREATE POLICY "members can read knowledge docs"
  ON company_knowledge_docs FOR SELECT
  USING (organization_id = current_user_organization_id());

CREATE POLICY "admins can insert knowledge docs"
  ON company_knowledge_docs FOR INSERT
  WITH CHECK (current_user_is_admin(organization_id));

CREATE POLICY "admins can update knowledge docs"
  ON company_knowledge_docs FOR UPDATE
  USING (current_user_is_admin(organization_id));

CREATE POLICY "admins can delete knowledge docs"
  ON company_knowledge_docs FOR DELETE
  USING (current_user_is_admin(organization_id));

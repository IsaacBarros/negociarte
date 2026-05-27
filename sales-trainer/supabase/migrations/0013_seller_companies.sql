-- Migration 0013: Vínculo seller ↔ empresa (projeto)
-- Idempotente: usa IF NOT EXISTS em todos os objetos.

CREATE TABLE IF NOT EXISTS seller_companies (
  seller_id       uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  company_id      uuid        NOT NULL REFERENCES scenario_companies ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES organizations ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (seller_id, company_id)
);

CREATE INDEX IF NOT EXISTS seller_companies_company
  ON seller_companies (company_id);

CREATE INDEX IF NOT EXISTS seller_companies_org
  ON seller_companies (organization_id);

-- RLS
ALTER TABLE seller_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellers read own company links"      ON seller_companies;
DROP POLICY IF EXISTS "admins insert seller company links"  ON seller_companies;
DROP POLICY IF EXISTS "admins delete seller company links"  ON seller_companies;

CREATE POLICY "sellers read own company links"
  ON seller_companies FOR SELECT
  USING (
    seller_id = auth.uid()
    OR current_user_is_admin(organization_id)
  );

CREATE POLICY "admins insert seller company links"
  ON seller_companies FOR INSERT
  WITH CHECK (current_user_is_admin(organization_id));

CREATE POLICY "admins delete seller company links"
  ON seller_companies FOR DELETE
  USING (current_user_is_admin(organization_id));

-- Atualizar RLS de customer_profiles: sellers só veem perfis de empresas vinculadas.
-- Drop da policy antiga (qualquer nome que possa existir) antes de recriar.
DROP POLICY IF EXISTS "sellers read active profiles"               ON public.customer_profiles;
DROP POLICY IF EXISTS "sellers read active customer profiles"      ON public.customer_profiles;
DROP POLICY IF EXISTS "sellers see profiles of linked companies"   ON public.customer_profiles;

CREATE POLICY "sellers see profiles of linked companies"
  ON public.customer_profiles FOR SELECT
  USING (
    current_user_is_admin(organization_id)
    OR (
      is_active = true
      AND (
        -- Perfis sem company_id ficam visíveis para todos os sellers da org (legado)
        company_id IS NULL
        OR company_id IN (
          SELECT company_id FROM seller_companies
          WHERE seller_id = auth.uid()
        )
      )
    )
  );

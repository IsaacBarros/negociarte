-- Migration 0014: Histórico de relacionamento seller ↔ cliente
-- Idempotente: usa IF NOT EXISTS em todos os objetos.

CREATE TABLE IF NOT EXISTS seller_customer_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations ON DELETE CASCADE,
  seller_id       uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  customer_id     uuid        NOT NULL REFERENCES scenario_customers ON DELETE CASCADE,
  history_text    text        NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, customer_id)
);

CREATE INDEX IF NOT EXISTS seller_customer_history_seller_customer
  ON seller_customer_history (seller_id, customer_id);

CREATE INDEX IF NOT EXISTS seller_customer_history_org
  ON seller_customer_history (organization_id);

-- RLS
ALTER TABLE seller_customer_history ENABLE ROW LEVEL SECURITY;

-- Dropar policies existentes antes de recriar (evita erro de duplicata)
DROP POLICY IF EXISTS "sellers read own history"  ON seller_customer_history;
DROP POLICY IF EXISTS "admins insert history"      ON seller_customer_history;
DROP POLICY IF EXISTS "admins update history"      ON seller_customer_history;
DROP POLICY IF EXISTS "admins delete history"      ON seller_customer_history;

-- Seller lê o próprio histórico; admin lê qualquer da org
CREATE POLICY "sellers read own history"
  ON seller_customer_history FOR SELECT
  USING (
    seller_id = auth.uid()
    OR current_user_is_admin(organization_id)
  );

-- Admins criam/atualizam o histórico de qualquer seller da org
CREATE POLICY "admins insert history"
  ON seller_customer_history FOR INSERT
  WITH CHECK (current_user_is_admin(organization_id));

CREATE POLICY "admins update history"
  ON seller_customer_history FOR UPDATE
  USING (current_user_is_admin(organization_id));

CREATE POLICY "admins delete history"
  ON seller_customer_history FOR DELETE
  USING (current_user_is_admin(organization_id));

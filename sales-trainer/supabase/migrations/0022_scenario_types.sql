CREATE TABLE scenario_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

ALTER TABLE scenario_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own org scenario_types"
  ON scenario_types FOR SELECT
  USING (organization_id = current_user_organization_id());

CREATE POLICY "admins manage scenario_types"
  ON scenario_types FOR ALL
  USING (current_user_is_admin(organization_id));

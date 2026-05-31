-- Migration: 0023_project_join_code.sql
-- Conteúdo idempotente — originalmente criado como 0018_project_join_code.sql (número duplicado).
-- Esta migration é reaplicada de forma segura; veja 0024_fix_migration_registry.sql.

-- 1. Adiciona a coluna (IF NOT EXISTS garante idempotência)
ALTER TABLE public.scenario_companies
  ADD COLUMN IF NOT EXISTS join_code TEXT;

-- 2. Popula registros existentes com códigos únicos (WHERE garante idempotência)
UPDATE public.scenario_companies
  SET join_code = replace(gen_random_uuid()::text, '-', '')
  WHERE join_code IS NULL;

-- 3. Torna NOT NULL (idempotente no PostgreSQL)
ALTER TABLE public.scenario_companies
  ALTER COLUMN join_code SET NOT NULL;

-- 4. Constraint UNIQUE (verificação manual para idempotência)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scenario_companies_join_code_key'
      AND conrelid = 'public.scenario_companies'::regclass
  ) THEN
    ALTER TABLE public.scenario_companies
      ADD CONSTRAINT scenario_companies_join_code_key UNIQUE (join_code);
  END IF;
END $$;

-- 5. Índice para busca rápida por join_code
CREATE INDEX IF NOT EXISTS idx_scenario_companies_join_code
  ON public.scenario_companies (join_code);

-- 6. Função SECURITY DEFINER para lookup por join_code e auto-vinculação
CREATE OR REPLACE FUNCTION public.join_project_by_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company    scenario_companies%ROWTYPE;
  v_user_id    UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT *
    INTO v_company
    FROM scenario_companies
   WHERE join_code = p_code
     AND is_active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'invalid_code');
  END IF;

  INSERT INTO seller_companies (seller_id, company_id, organization_id)
  VALUES (v_user_id, v_company.id, v_company.organization_id)
  ON CONFLICT (seller_id, company_id) DO NOTHING;

  UPDATE profiles
     SET organization_id = v_company.organization_id,
         updated_at = now()
   WHERE id = v_user_id
     AND organization_id IS NULL;

  RETURN json_build_object(
    'company_id',       v_company.id,
    'company_name',     v_company.name,
    'organization_id',  v_company.organization_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_project_by_code(TEXT) TO authenticated;

-- 7. Função auxiliar para buscar nome do projeto por código
CREATE OR REPLACE FUNCTION public.get_project_by_join_code(p_code TEXT)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sc.id, sc.name
    FROM scenario_companies sc
   WHERE sc.join_code = p_code
     AND sc.is_active = true
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_by_join_code(TEXT) TO authenticated;

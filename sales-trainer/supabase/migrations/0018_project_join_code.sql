-- Migration: 0018_project_join_code.sql
-- Adiciona join_code em scenario_companies para acesso autônomo do vendedor
-- via link /join/[code]

-- 1. Adiciona a coluna (nullable primeiro para popular dados existentes)
ALTER TABLE public.scenario_companies
  ADD COLUMN IF NOT EXISTS join_code TEXT;

-- 2. Popula registros existentes com códigos únicos
UPDATE public.scenario_companies
  SET join_code = replace(gen_random_uuid()::text, '-', '')
  WHERE join_code IS NULL;

-- 3. Torna NOT NULL e UNIQUE
ALTER TABLE public.scenario_companies
  ALTER COLUMN join_code SET NOT NULL;

ALTER TABLE public.scenario_companies
  ADD CONSTRAINT scenario_companies_join_code_key UNIQUE (join_code);

-- 4. Índice para busca rápida por join_code
CREATE INDEX IF NOT EXISTS idx_scenario_companies_join_code
  ON public.scenario_companies (join_code);

-- 5. Função SECURITY DEFINER para lookup por join_code e auto-vinculação
--    Chamada pelo seller autenticado ao acessar /join/[code].
--    Bypassa o RLS de scenario_companies (que exige mesmo org_id),
--    permitindo que o seller seja vinculado ao projeto correto.
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
  -- Verifica autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Busca empresa pelo código
  SELECT *
    INTO v_company
    FROM scenario_companies
   WHERE join_code = p_code
     AND is_active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'invalid_code');
  END IF;

  -- Vincula seller à empresa (ignora se já vinculado)
  INSERT INTO seller_companies (seller_id, company_id, organization_id)
  VALUES (v_user_id, v_company.id, v_company.organization_id)
  ON CONFLICT (seller_id, company_id) DO NOTHING;

  -- Atualiza organization_id do seller se ainda não tem (novo usuário)
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

-- 6. Concede execução ao role authenticated
GRANT EXECUTE ON FUNCTION public.join_project_by_code(TEXT) TO authenticated;

-- 7. Função auxiliar para buscar nome do projeto por código
--    (usada na join page antes de executar a vinculação)
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

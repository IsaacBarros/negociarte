-- Migration: 0024_fix_migration_registry.sql
-- Remove a entrada duplicada '0018_project_join_code' do registro interno do Supabase CLI.
-- Condicional: no-op se o schema supabase_migrations não existir (ambientes sem CLI).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata
    WHERE schema_name = 'supabase_migrations'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'supabase_migrations'
      AND table_name   = 'schema_migrations'
  ) THEN
    DELETE FROM supabase_migrations.schema_migrations
      WHERE version = '0018_project_join_code';
  END IF;
END $$;

-- Migration: 0024_fix_migration_registry.sql
-- Remove a entrada duplicada '0018_project_join_code' do registro interno do Supabase.
-- O conteúdo dessa migration está re-registrado corretamente como '0023_project_join_code'.
DELETE FROM supabase_migrations.schema_migrations
  WHERE version = '0018_project_join_code';

-- 2026-07-24-imports-list-status.sql
-- Autorise le status 'list' sur la table `imports` : un post qui liste plusieurs
-- restaurants (« 5 spots à Paris ») devient un import de type liste, dont les
-- lieux résolus sont stockés dans la colonne `candidates` existante (jusqu'à 8).
-- À exécuter dans l'éditeur SQL de Supabase, APRÈS sql/imports.sql.

ALTER TABLE imports DROP CONSTRAINT IF EXISTS imports_status_check;
ALTER TABLE imports
  ADD CONSTRAINT imports_status_check
  CHECK (status IN ('pending', 'resolved', 'ambiguous', 'failed', 'list'));

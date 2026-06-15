-- ============================================================
-- Migration de cohérence — 2026-06-15
-- À exécuter dans l'éditeur SQL Supabase SUR UNE BASE EXISTANTE.
-- Pour une nouvelle installation, sql/schema.sql contient déjà l'état final.
--
-- Objectif : aligner favorites/visits sur lists/push_tokens
--   - user_id TEXT  → UUID + FK auth.users (auth obligatoire, plus de demo-user)
--   - RLS : suppression du fallback 'demo-user', comparaison UUID directe
--   - visits.mood : ajout d'une contrainte CHECK
--
-- ⚠️ PRÉREQUIS : aucune ligne ne doit avoir user_id = 'demo-user' ni une
--    valeur non-UUID, sinon le cast échoue. Nettoyer d'abord :
--      DELETE FROM favorites WHERE user_id !~ '^[0-9a-f-]{36}$';
--      DELETE FROM visits    WHERE user_id !~ '^[0-9a-f-]{36}$';
--    (ou réassigner ces lignes à un vrai user_id avant de migrer)
--
-- ⚠️ Faire une sauvegarde avant d'exécuter.
-- ============================================================

BEGIN;

-- ── favorites ───────────────────────────────────────────────
ALTER TABLE favorites
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

ALTER TABLE favorites
  ADD CONSTRAINT favorites_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Users see own favorites" ON favorites;
CREATE POLICY "Users see own favorites" ON favorites
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── visits ──────────────────────────────────────────────────
ALTER TABLE visits
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

ALTER TABLE visits
  ADD CONSTRAINT visits_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE visits
  ADD CONSTRAINT visits_mood_check
  CHECK (mood IN ('solo','couple','friends','family','work'));

DROP POLICY IF EXISTS "Users see own visits" ON visits;
CREATE POLICY "Users see own visits" ON visits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;

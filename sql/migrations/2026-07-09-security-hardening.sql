-- ============================================================
-- 2026-07-09 — Durcissement sécurité (audit)
--
-- À exécuter dans l'éditeur SQL de Supabase, APRÈS les schémas de base.
-- Idempotent : peut être rejoué sans dommage.
-- ============================================================

-- ------------------------------------------------------------
-- 1. osm_fsq_mapping : la seule table sans RLS.
--
-- Supabase accorde par défaut INSERT/UPDATE/DELETE aux rôles `anon` et
-- `authenticated` sur les tables du schéma `public`. Sans RLS, n'importe qui
-- muni de la clé anon (publique par conception) pouvait, depuis un navigateur :
--
--   supabase.from('osm_fsq_mapping').delete().neq('osm_id', '')   -- purge du cache
--   supabase.from('osm_fsq_mapping').upsert({ osm_id: '…', fsq_id: 'ATTACKER' })
--
-- soit vider le cache de correspondance OSM → Foursquare pour tous les
-- utilisateurs, soit y injecter de fausses correspondances (la fiche d'un
-- restaurant affiche alors les notes et photos d'un autre).
--
-- Le cache est écrit uniquement par les routes serveur via la clé service-role,
-- qui contourne la RLS : aucune politique d'écriture n'est donc nécessaire.
-- ------------------------------------------------------------
ALTER TABLE osm_fsq_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "osm_fsq_mapping_public_read" ON osm_fsq_mapping;
CREATE POLICY "osm_fsq_mapping_public_read" ON osm_fsq_mapping
  FOR SELECT USING (true);

-- Ceinture et bretelles : retirer les DML accordés par défaut aux rôles clients.
REVOKE INSERT, UPDATE, DELETE ON osm_fsq_mapping FROM anon, authenticated;

-- ------------------------------------------------------------
-- 2. poll_votes : `option_id` et `poll_id` étaient deux clés étrangères
-- indépendantes. Rien, en base, n'empêchait un vote dont l'option appartient à
-- un autre sondage, ce qui corromprait les décomptes. Le serveur le vérifie
-- déjà (castVote), mais la garantie doit exister en base.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'poll_options_id_poll_uq'
  ) THEN
    ALTER TABLE poll_options ADD CONSTRAINT poll_options_id_poll_uq UNIQUE (id, poll_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'poll_votes_option_matches_poll'
  ) THEN
    ALTER TABLE poll_votes
      ADD CONSTRAINT poll_votes_option_matches_poll
      FOREIGN KEY (option_id, poll_id)
      REFERENCES poll_options (id, poll_id) ON DELETE CASCADE;
  END IF;
END $$;

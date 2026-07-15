-- sql/imports.sql — à exécuter dans l'éditeur SQL de Supabase, APRÈS schema.sql.
-- Un post social enregistré depuis la Share Extension. Sauvé instantanément
-- (status 'pending'), résolu ensuite par l'appareil (Google fait autorité).
CREATE TABLE IF NOT EXISTS imports (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url            TEXT        NOT NULL CHECK (char_length(url) BETWEEN 8 AND 2048),
  platform       TEXT        NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'other')),
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'resolved', 'ambiguous', 'failed')),
  note           TEXT        CHECK (note IS NULL OR char_length(note) <= 500),

  -- Métadonnées du post, remplies par l'appareil (oEmbed / Open Graph).
  post_title     TEXT,
  post_caption   TEXT,
  post_author    TEXT,
  post_thumb     TEXT,

  -- Résolution.
  osm_id         TEXT,   -- le resto retenu (NULL tant qu'on ne sait pas)
  place_snapshot JSONB,  -- snapshot PlaceCard, comme `favorites`
  candidates     JSONB,  -- les 2-3 candidats quand status = 'ambiguous'

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at    TIMESTAMPTZ,

  -- Repartager le même post ne crée pas un second import.
  UNIQUE (user_id, url)
);

ALTER TABLE imports ENABLE ROW LEVEL SECURITY;

-- Propriétaire seul (le serveur autorise aussi par userId via la clé service-role).
DROP POLICY IF EXISTS "imports_own_all" ON imports;
CREATE POLICY "imports_own_all" ON imports
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- La rangée « Vus sur les réseaux » : les imports d'un user, du plus récent au plus ancien.
CREATE INDEX IF NOT EXISTS imports_user_created_idx ON imports (user_id, created_at DESC);
-- « Vu aussi dans » + le badge de provenance sur un favori.
CREATE INDEX IF NOT EXISTS imports_user_osm_idx ON imports (user_id, osm_id);

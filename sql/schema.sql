-- ============================================================
-- sql/schema.sql — Supabase PostgreSQL schema v2
-- Supports real Supabase Auth user IDs (UUID)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Table: favorites
-- user_id is now TEXT to support both UUID auth users
-- and the "demo-user" fallback for unauthenticated sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  osm_id      TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lon         DOUBLE PRECISION NOT NULL,
  fsq_id      TEXT,
  snapshot    JSONB       NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, osm_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites (user_id);

-- ============================================================
-- Table: osm_fsq_mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS osm_fsq_mapping (
  osm_id      TEXT        PRIMARY KEY,
  fsq_id      TEXT        NOT NULL,
  confidence  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  matched_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Authenticated users see only their own favorites
CREATE POLICY "Users see own favorites" ON favorites
  FOR ALL
  USING (
    auth.uid()::TEXT = user_id
    OR user_id = 'demo-user'   -- fallback for unauthenticated
  )
  WITH CHECK (
    auth.uid()::TEXT = user_id
    OR user_id = 'demo-user'
  );

-- Allow service role to bypass RLS (used by server routes)
-- This is automatic for the service role key

-- ============================================================
-- Migration: if upgrading from demo schema
-- ============================================================
-- ALTER TABLE favorites ALTER COLUMN user_id TYPE TEXT;
-- UPDATE favorites SET user_id = 'demo-user' WHERE user_id = 'demo-user';

-- ============================================================
-- Table: visits
-- Tracks each restaurant visit with spending, rating, notes
-- ============================================================
CREATE TABLE IF NOT EXISTS visits (
  id            UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       TEXT          NOT NULL,
  osm_id        TEXT          NOT NULL,
  name          TEXT          NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lon           DOUBLE PRECISION NOT NULL,
  visited_at    DATE          NOT NULL DEFAULT CURRENT_DATE,
  amount_spent  DECIMAL(8,2),          -- euros, can be null
  people_count  INTEGER       DEFAULT 1,-- number of people
  personal_rating INTEGER     CHECK (personal_rating BETWEEN 1 AND 5),
  mood          TEXT,                  -- 'solo','couple','friends','family','work'
  note          TEXT,                  -- free text note
  snapshot      JSONB,                 -- place snapshot at time of visit
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS visits_user_id_idx     ON visits (user_id);
CREATE INDEX IF NOT EXISTS visits_visited_at_idx  ON visits (user_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS visits_osm_id_idx      ON visits (user_id, osm_id);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own visits" ON visits
  FOR ALL
  USING  (auth.uid()::TEXT = user_id)
  WITH CHECK (auth.uid()::TEXT = user_id);

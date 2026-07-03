-- sql/notes.sql — run in the Supabase SQL editor after schema.sql
-- Personal notes on a restaurant, synced across devices (was localStorage-only).
CREATE TABLE IF NOT EXISTS notes (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  osm_id     TEXT        NOT NULL,
  text       TEXT        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, osm_id)
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Owner-only read/write (server also authorizes by userId via the service role).
CREATE POLICY "notes_own_all" ON notes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notes_user_idx ON notes (user_id);

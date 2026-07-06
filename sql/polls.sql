-- sql/polls.sql — run in Supabase SQL editor after schema.sql
-- Group polls ("où on mange ce soir ?"). Anonymous link voting: the creator is
-- authenticated, voters are identified by a client-generated voter_token. All
-- public reads/writes go through service-role server routes; RLS below only
-- guards direct client access (owner-only).

CREATE TABLE IF NOT EXISTS polls (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  closed     BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_options (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id        UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  osm_id         TEXT NOT NULL,
  place_snapshot JSONB NOT NULL,
  position       SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id    UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  voter_token  TEXT NOT NULL,
  voter_name   TEXT CHECK (voter_name IS NULL OR char_length(voter_name) <= 40),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, voter_token)
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polls_owner" ON polls FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_options_owner" ON poll_options FOR ALL
  USING (poll_id IN (SELECT id FROM polls WHERE owner_id = auth.uid()))
  WITH CHECK (poll_id IN (SELECT id FROM polls WHERE owner_id = auth.uid()));

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_votes_owner_read" ON poll_votes FOR SELECT
  USING (poll_id IN (SELECT id FROM polls WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS poll_options_poll ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS poll_votes_poll ON poll_votes(poll_id);

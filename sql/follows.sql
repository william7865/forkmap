-- sql/follows.sql — run in the Supabase SQL editor after profiles.sql.
-- Unilateral "follow" (tastemakers), distinct from mutual friendships.
-- A follows B does not require B's approval.

CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Public read (follow graph is public, like counts on a profile). A user may
-- only create/remove their OWN follow edges. The server also authorizes by
-- userId (service-role bypasses RLS), same pattern as the rest of the app.
DROP POLICY IF EXISTS "follows_public_read" ON follows;
CREATE POLICY "follows_public_read" ON follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "follows_insert_own" ON follows;
CREATE POLICY "follows_insert_own" ON follows
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete_own" ON follows;
CREATE POLICY "follows_delete_own" ON follows
  FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_followee_idx ON follows (followee_id);

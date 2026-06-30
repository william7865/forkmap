-- sql/friends.sql — run in Supabase SQL editor after profiles.sql
CREATE TABLE IF NOT EXISTS friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships_involved_read" ON friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friendships_request_insert" ON friendships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "friendships_respond_update" ON friendships
  FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id);
CREATE POLICY "friendships_involved_delete" ON friendships
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE INDEX IF NOT EXISTS friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee ON friendships(addressee_id);

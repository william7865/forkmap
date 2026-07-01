-- sql/messages.sql — run in Supabase SQL editor after friends.sql
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ,
  CHECK (sender_id <> receiver_id)
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read_participant" ON messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "messages_send_own" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update_participant" ON messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE INDEX IF NOT EXISTS messages_pair ON messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_receiver ON messages(receiver_id, created_at DESC);

-- Active la diffusion Realtime des changements de cette table.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

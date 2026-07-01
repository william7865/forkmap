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
-- INSERT : on doit être l'expéditeur ET ami accepté du destinataire.
-- La règle "amis uniquement" DOIT vivre dans la RLS (la clé anon est publique,
-- la table est joignable en direct ; ne pas faire confiance au seul code serveur).
CREATE POLICY "messages_send_to_friend" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = sender_id AND f.addressee_id = receiver_id)
          OR (f.requester_id = receiver_id AND f.addressee_id = sender_id))
    )
  );
-- Pas de policy UPDATE : les accusés de lecture (read_at) sont posés côté serveur
-- via le client service-role (qui contourne la RLS). Une policy UPDATE ouverte
-- permettrait à un participant de falsifier le contenu d'un message de l'autre.

CREATE INDEX IF NOT EXISTS messages_pair ON messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_receiver ON messages(receiver_id, created_at DESC);

-- Active la diffusion Realtime des changements de cette table.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

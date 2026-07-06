-- sql/list-collaborators.sql — run in the Supabase SQL editor after lists.sql
-- Collaborative lists: the owner invites friends as editors who can add/remove
-- items. Data access goes through the service-role client (lib/db.ts), so the
-- real authorization lives in the code (canEditList); RLS below is a backstop.

CREATE TABLE IF NOT EXISTS list_collaborators (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id    UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, user_id)
);

ALTER TABLE list_collaborators ENABLE ROW LEVEL SECURITY;

-- The list owner manages collaborators; a collaborator can read their own row.
CREATE POLICY "list_collaborators_owner_all" ON list_collaborators FOR ALL
  USING (list_id IN (SELECT id FROM lists WHERE user_id = auth.uid()))
  WITH CHECK (list_id IN (SELECT id FROM lists WHERE user_id = auth.uid()));
CREATE POLICY "list_collaborators_self_read" ON list_collaborators FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS list_collaborators_list ON list_collaborators(list_id);
CREATE INDEX IF NOT EXISTS list_collaborators_user ON list_collaborators(user_id);

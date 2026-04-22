-- sql/lists.sql
-- Run in Supabase SQL editor after schema.sql

CREATE TABLE IF NOT EXISTS lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) <= 40),
  description TEXT CHECK (char_length(description) <= 120),
  is_public   BOOLEAN NOT NULL DEFAULT false,
  color_hue   SMALLINT NOT NULL DEFAULT 160,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS list_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id        UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  osm_id         TEXT NOT NULL,
  place_snapshot JSONB NOT NULL,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, osm_id)
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lists_owner" ON lists FOR ALL USING (auth.uid() = user_id);

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "list_items_owner" ON list_items FOR ALL
  USING (list_id IN (SELECT id FROM lists WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS list_items_list_id ON list_items(list_id);
CREATE INDEX IF NOT EXISTS lists_user_id ON lists(user_id);

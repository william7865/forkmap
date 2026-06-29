-- sql/profiles.sql — run in Supabase SQL editor after schema.sql
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name        TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  avatar_url          TEXT,
  username_changed_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_authenticated" ON profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_write_own" ON profiles
  FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS profiles_username ON profiles(username);

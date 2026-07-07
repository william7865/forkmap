-- sql/verification.sql — run in the Supabase SQL editor after profiles.sql.
-- Tastemaker verification: a `verified` badge on profiles, granted through a
-- request + moderation flow. Approval is done server-side by admins (service
-- role); the badge column is public-read via the existing profiles policy.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- CRITICAL: the existing `profiles_write_own` policy (profiles.sql) is FOR ALL
-- with `auth.uid() = id`, and Postgres RLS is row-level only — it cannot stop a
-- user from writing the new `verified` column. Without this, any signed-in user
-- could PATCH their own profile row with the anon key and self-grant the badge,
-- bypassing the whole admin flow. The app never writes profiles from the client
-- (all writes go through the service-role /api/profile route), so revoke direct
-- DML from anon/authenticated entirely. SELECT (public read) is untouched.
REVOKE INSERT, UPDATE, DELETE ON profiles FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS verification_requests (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note         TEXT        CHECK (note IS NULL OR char_length(note) <= 500),
  links        TEXT[]      NOT NULL DEFAULT '{}' CHECK (cardinality(links) <= 5),
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_note TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ
);

-- One open request per user (re-requesting reuses/updates the row via the server).
CREATE UNIQUE INDEX IF NOT EXISTS verification_requests_user_idx
  ON verification_requests (user_id);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- The user can read their own request. Status changes and admin listing go
-- through service-role routes (which bypass RLS), gated by ADMIN_USER_IDS.
DROP POLICY IF EXISTS "verification_read_own" ON verification_requests;
CREATE POLICY "verification_read_own" ON verification_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

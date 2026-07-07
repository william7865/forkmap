-- sql/reviews.sql — run in the Supabase SQL editor after schema.sql & profiles.sql.
-- Community reviews: one review per (user, place) with rating, text and up to 4 photos.
-- Reviews are PUBLIC to read (community content); only the owner can write/delete.

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  osm_id         TEXT        NOT NULL,
  rating         INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text           TEXT        CHECK (text IS NULL OR char_length(text) <= 500),
  photo_urls     TEXT[]      NOT NULL DEFAULT '{}' CHECK (cardinality(photo_urls) <= 4),
  place_snapshot JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, osm_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public read (community content). WRITES ARE SERVER-ONLY: all mutations go
-- through /api/reviews with the service-role key (which bypasses RLS) and are
-- authorized by userId there. We deliberately grant NO write policy to
-- `authenticated`, so a client cannot INSERT/UPDATE directly with the anon key
-- and bypass the server-side photo_url allowlist / snapshot validation.
DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews
  FOR SELECT USING (true);

-- (Legacy owner-write policies removed — writes are now service-role only.)
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;

CREATE INDEX IF NOT EXISTS reviews_osm_idx ON reviews (osm_id);
CREATE INDEX IF NOT EXISTS reviews_user_idx ON reviews (user_id);

-- ── Storage bucket for review photos ─────────────────────────────────────────
-- Public-read; each user writes only under reviews/{their uid}/…  (same as avatars).
INSERT INTO storage.buckets (id, name, public)
VALUES ('reviews', 'reviews', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "reviews_photos_public_read" ON storage.objects;
CREATE POLICY "reviews_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'reviews');

DROP POLICY IF EXISTS "reviews_photos_write_own" ON storage.objects;
CREATE POLICY "reviews_photos_write_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reviews' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "reviews_photos_update_own" ON storage.objects;
CREATE POLICY "reviews_photos_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'reviews' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "reviews_photos_delete_own" ON storage.objects;
CREATE POLICY "reviews_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reviews' AND auth.uid()::text = (storage.foldername(name))[1]);

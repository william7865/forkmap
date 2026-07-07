-- 2026-07-07-list-visibility.sql — run after sql/lists.sql.
-- Adds a 3-way visibility to lists (private / friends / public), replacing the
-- boolean is_public as the source of truth. is_public is kept in sync by the
-- server (is_public = visibility = 'public') for backward compatibility.

ALTER TABLE lists ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'friends', 'public'));

-- Backfill: existing public lists → 'public' (others keep the 'private' default).
UPDATE lists SET visibility = 'public' WHERE is_public = true AND visibility = 'private';

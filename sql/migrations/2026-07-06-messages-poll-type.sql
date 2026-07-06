-- 2026-07-06 — Allow 'poll' as a message type.
-- The messages.type CHECK constraint (from social-v2.sql) only permitted
-- ('text','place'); sharing a poll into a DM (type 'poll') violated it, so the
-- insert failed. Widen the constraint to include 'poll'.
-- Run in the Supabase SQL editor.

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_type_check CHECK (type IN ('text', 'place', 'poll'));

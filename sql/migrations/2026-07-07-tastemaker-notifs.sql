-- 2026-07-07-tastemaker-notifs.sql — run after social-v2.sql, follows.sql, verification.sql.
-- Notify followers when a tastemaker is active. The tastemaker chooses the
-- trigger: every saved restaurant, or only public-list updates (or off).

-- Widen the notifications type CHECK to cover the two new events.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('friend_request', 'friend_accept', 'message', 'tastemaker_save', 'tastemaker_list'));

-- Per-user preference for what pings followers ('lists' is the quiet default).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS follower_notify_pref TEXT NOT NULL DEFAULT 'lists'
  CHECK (follower_notify_pref IN ('saves', 'lists', 'off'));

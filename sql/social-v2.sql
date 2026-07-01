-- ═══════════════════════════════════════════════════════════════
-- Forkmap — Social v2
-- Bio · Partage de resto en message · Fil d'activité · Notifications
-- À exécuter dans l'éditeur SQL Supabase APRÈS les fichiers existants
-- (schema.sql, lists.sql, push_tokens.sql, profiles.sql, friends.sql, messages.sql).
-- Idempotent : réexécutable sans dommage.
-- ═══════════════════════════════════════════════════════════════

-- 1) PROFILS : bio ------------------------------------------------
alter table public.profiles
  add column if not exists bio text check (char_length(bio) <= 200);

-- 2) MESSAGES : type + payload (partage d'un resto) ---------------
alter table public.messages
  add column if not exists type text not null default 'text'
    check (type in ('text', 'place'));
alter table public.messages
  add column if not exists payload jsonb;

-- 3) FIL D'ACTIVITÉ ----------------------------------------------
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('favorite', 'visit', 'list')),
  osm_id text,
  place_name text,
  cuisine text,
  rating numeric,
  list_name text,
  created_at timestamptz not null default now()
);
create index if not exists activity_events_user_created_idx
  on public.activity_events (user_id, created_at desc);

alter table public.activity_events enable row level security;

-- Lecture : soi + ses amis acceptés.
drop policy if exists "activity readable by self and friends" on public.activity_events;
create policy "activity readable by self and friends" on public.activity_events
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = activity_events.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = activity_events.user_id)
        )
    )
  );
-- Insert : soi uniquement (le serveur en service-role contourne la RLS de toute façon).
drop policy if exists "activity insert own" on public.activity_events;
create policy "activity insert own" on public.activity_events
  for insert with check (user_id = auth.uid());

-- Realtime (le feed se met à jour en direct).
do $$ begin
  alter publication supabase_realtime add table public.activity_events;
exception when duplicate_object then null; end $$;

-- 4) NOTIFICATIONS -----------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,  -- destinataire
  actor_id uuid references auth.users(id) on delete cascade,          -- qui déclenche
  type text not null check (type in ('friend_request', 'friend_accept', 'message')),
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications
  for select using (user_id = auth.uid());
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications
  for update using (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

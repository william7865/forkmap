-- ═══════════════════════════════════════════════════════════════
-- Forkmap — Social v4
-- Blocage d'utilisateur · Réactions emoji · Répondre à un message
-- À exécuter dans l'éditeur SQL Supabase APRÈS messages.sql / messages-v2.sql. Idempotent.
-- ═══════════════════════════════════════════════════════════════

-- 1) BLOCAGE ------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks own" on public.blocks;
create policy "blocks own" on public.blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- 2) RÉACTIONS AUX MESSAGES --------------------------------------
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
create index if not exists message_reactions_msg_idx on public.message_reactions (message_id);
alter table public.message_reactions enable row level security;
-- Lecture : participant du message. Écriture : ses propres réactions.
drop policy if exists "reactions read" on public.message_reactions;
create policy "reactions read" on public.message_reactions
  for select using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
    )
  );
drop policy if exists "reactions write own" on public.message_reactions;
create policy "reactions write own" on public.message_reactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null; end $$;

-- 3) RÉPONDRE À UN MESSAGE ---------------------------------------
alter table public.messages
  add column if not exists reply_to uuid references public.messages(id) on delete set null;

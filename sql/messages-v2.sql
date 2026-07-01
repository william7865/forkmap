-- ═══════════════════════════════════════════════════════════════
-- Forkmap — Messages v2
-- Édition / suppression de message · rendre muet / effacer une conversation
-- À exécuter dans l'éditeur SQL Supabase APRÈS messages.sql. Idempotent.
-- ═══════════════════════════════════════════════════════════════

-- 1) MESSAGES : édition + suppression douce ----------------------
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;

-- 2) PRÉFÉRENCES DE CONVERSATION (par utilisateur) ---------------
-- muted     : notifications/badge coupés pour cette conversation
-- cleared_at: « supprimer la conversation pour moi » — masque les messages
--             antérieurs ou égaux à cette date, côté user_id uniquement.
create table if not exists public.conversation_prefs (
  user_id uuid not null references auth.users(id) on delete cascade,
  other_id uuid not null references auth.users(id) on delete cascade,
  muted boolean not null default false,
  cleared_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, other_id)
);

alter table public.conversation_prefs enable row level security;

drop policy if exists "conv prefs own" on public.conversation_prefs;
create policy "conv prefs own" on public.conversation_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- id8 · the desk. Run once in the Supabase SQL editor (Jeffrey applies migrations).
-- Every table is RLS-on; a trader sees only their own desk.

create extension if not exists pgcrypto;

create table if not exists public.desks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.plays (
  id uuid primary key default gen_random_uuid(),
  desk_id uuid not null references public.desks(id) on delete cascade,
  ticker text,                      -- what the trader typed ($HYPE), null = narrative play
  chain text,                       -- where the tape resolved it
  address text,
  sector text,                      -- the planner's first sector, for narrative plays
  slug text not null,               -- session slug for the card
  session jsonb not null,           -- the Stored session object: thesis, extraction, challenge, structure
  pins jsonb not null default '[]'::jsonb, -- the wall: pinned X posts (url, author, html, text, pinned_at)
  booked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists plays_desk_booked on public.plays (desk_id, booked_at desc);

create table if not exists public.watches (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references public.plays(id) on delete cascade,
  read_at timestamptz not null default now(),
  status text not null check (status in ('holding','breached','unwatched')),
  figures jsonb not null default '{}'::jsonb
);
create index if not exists watches_play_read on public.watches (play_id, read_at desc);

alter table public.desks enable row level security;
alter table public.plays enable row level security;
alter table public.watches enable row level security;

-- desks: a user owns exactly one, and can create it
create policy "desk: own" on public.desks
  for select using (auth.uid() = user_id);
create policy "desk: create own" on public.desks
  for insert with check (auth.uid() = user_id);

-- plays: through the desk
create policy "plays: own" on public.plays
  for select using (exists (select 1 from public.desks d where d.id = desk_id and d.user_id = auth.uid()));
create policy "plays: create own" on public.plays
  for insert with check (exists (select 1 from public.desks d where d.id = desk_id and d.user_id = auth.uid()));
create policy "plays: update own" on public.plays
  for update using (exists (select 1 from public.desks d where d.id = desk_id and d.user_id = auth.uid()));
create policy "plays: delete own" on public.plays
  for delete using (exists (select 1 from public.desks d where d.id = desk_id and d.user_id = auth.uid()));

-- watches: through the play's desk
create policy "watches: own" on public.watches
  for select using (exists (select 1 from public.plays p join public.desks d on d.id = p.desk_id where p.id = play_id and d.user_id = auth.uid()));
create policy "watches: create own" on public.watches
  for insert with check (exists (select 1 from public.plays p join public.desks d on d.id = p.desk_id where p.id = play_id and d.user_id = auth.uid()));

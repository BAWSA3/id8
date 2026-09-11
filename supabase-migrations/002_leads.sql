-- id8 · leads. Run once in the Supabase SQL editor (Jeffrey applies migrations).
-- One table, insert-only from the public key. Nobody can read it through the API;
-- read it in the dashboard. Accounts land later; this is the list that hears first.
-- The server route uses the PUBLISHABLE (anon) key; never give it the secret key.

create extension if not exists pgcrypto;

create table if not exists public.id8_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'desk',   -- where the line was answered: commit | desk
  ticker text,                           -- the play on the book at the time, if any
  created_at timestamptz not null default now()
);
create unique index if not exists id8_leads_email_key on public.id8_leads (lower(email));

alter table public.id8_leads enable row level security;

-- the public key may add a row and nothing else
drop policy if exists "anon can leave a lead" on public.id8_leads;
create policy "anon can leave a lead" on public.id8_leads
  for insert to anon with check (true);

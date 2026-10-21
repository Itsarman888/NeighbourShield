-- NeighbourShield report storage.
-- The browser never receives the service-role key. Only Vercel serverless functions use it.
create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Road hazard', 'Medical help needed', 'Fire / smoke', 'Flooding', 'Unsafe area', 'Other')),
  severity text not null check (severity in ('Low', 'Medium', 'High', 'Critical')),
  details text not null check (char_length(details) between 8 and 500),
  area text not null default '' check (char_length(area) <= 100),
  lat double precision not null check (lat between 6 and 38),
  lng double precision not null check (lng between 68 and 98),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
-- Intentionally no public table policies: all database access goes through the Vercel API
-- using the server-only service-role key. Never put that key in VITE_ environment variables.
create index if not exists reports_created_at_idx on public.reports (created_at desc);

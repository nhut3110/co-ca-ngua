-- Server-only storage. Browser clients never access room records or seat token hashes.
create table if not exists public.skyhoof_rooms (
  code text primary key check (code ~ '^[A-Z2-9]{6}$'),
  version integer not null check (version >= 0),
  data jsonb not null,
  expires_at timestamptz not null
);
alter table public.skyhoof_rooms enable row level security;
revoke all on table public.skyhoof_rooms from anon, authenticated;
create index if not exists skyhoof_rooms_expiry on public.skyhoof_rooms (expires_at);
grant select, insert, update, delete on table public.skyhoof_rooms to service_role;

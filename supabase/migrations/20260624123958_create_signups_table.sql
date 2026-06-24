create table if not exists public.signups (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    message text,
    created_at timestamptz not null default now()
);

-- RLS intentionally left disabled for now.
alter table public.signups disable row level security;

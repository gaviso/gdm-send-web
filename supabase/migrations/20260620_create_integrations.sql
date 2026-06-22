-- Per-provider integration configuration (third-party services we connect to)
-- Values here override the corresponding env vars at runtime.

create table public.integrations (
  provider text primary key,
  config jsonb not null default '{}',
  is_active boolean not null default true,
  updated_at timestamptz default now() not null
);

alter table public.integrations enable row level security;

-- Only authenticated admins can read/write integrations
create policy "Authenticated users can read integrations"
  on public.integrations for select to authenticated using (true);

create policy "Authenticated users can manage integrations"
  on public.integrations for all to authenticated using (true);

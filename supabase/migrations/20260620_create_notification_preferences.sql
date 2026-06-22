-- Per-channel notification preferences. Admin can toggle each event
-- type on each delivery channel independently.

create table public.notification_preferences (
  channel text not null check (channel in ('email', 'slack')),
  event_type text not null,
  is_enabled boolean not null default false,
  updated_at timestamptz default now() not null,
  primary key (channel, event_type)
);

alter table public.notification_preferences enable row level security;

create policy "Authenticated users can read notification preferences"
  on public.notification_preferences for select to authenticated using (true);

create policy "Authenticated users can manage notification preferences"
  on public.notification_preferences for all to authenticated using (true);

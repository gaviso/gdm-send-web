-- Email templates that override the in-code defaults. Missing rows mean
-- the default template is used.

create table public.email_templates (
  key text primary key,
  subject text not null,
  body text not null,
  is_enabled boolean not null default true,
  updated_at timestamptz default now() not null
);

alter table public.email_templates enable row level security;

create policy "Authenticated users can read email templates"
  on public.email_templates for select to authenticated using (true);

create policy "Authenticated users can manage email templates"
  on public.email_templates for all to authenticated using (true);

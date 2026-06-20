-- GDM Send Database Schema (Supabase / PostgreSQL)
-- Run this in your Supabase SQL Editor

create extension if not exists "uuid-ossp";

-- Transfers table
create table public.transfers (
  id uuid default uuid_generate_v4() primary key,
  sender_name text not null,
  sender_email text not null,
  subject text not null default '',
  message text not null default '',
  total_size bigint not null default 0,
  file_count integer not null default 0,
  status text not null default 'uploading' check (status in ('uploading', 'received', 'downloaded', 'expired', 'deleted')),
  created_at timestamptz default now() not null,
  expires_at timestamptz not null
);

-- Files table
create table public.files (
  id uuid default uuid_generate_v4() primary key,
  transfer_id uuid references public.transfers(id) on delete cascade not null,
  filename text not null,
  file_size bigint not null,
  mime_type text not null default 'application/octet-stream',
  storage_path text not null,
  created_at timestamptz default now() not null
);

-- Settings table
create table public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now() not null
);

-- Download logs
create table public.download_logs (
  id uuid default uuid_generate_v4() primary key,
  transfer_id uuid references public.transfers(id) on delete cascade not null,
  file_id uuid references public.files(id) on delete cascade,
  downloaded_at timestamptz default now() not null,
  ip_address text
);

-- Default settings
insert into public.settings (key, value) values
  ('max_file_size', '5368709120'),
  ('max_transfer_size', '5368709120'),
  ('transfer_expiry_days', '30'),
  ('notification_email', 'admin@gaviso.agency'),
  ('auto_delete_expired', 'true');

-- Indexes
create index idx_transfers_status on public.transfers(status);
create index idx_transfers_created_at on public.transfers(created_at desc);
create index idx_files_transfer_id on public.files(transfer_id);
create index idx_download_logs_transfer_id on public.download_logs(transfer_id);

-- RLS policies
alter table public.transfers enable row level security;
alter table public.files enable row level security;
alter table public.settings enable row level security;
alter table public.download_logs enable row level security;

-- Public can create transfers and files (no auth required for uploads)
create policy "Anyone can create transfers"
  on public.transfers for insert with check (true);

create policy "Anyone can read transfers"
  on public.transfers for select using (true);

create policy "Anyone can update transfer status"
  on public.transfers for update
  using (true)
  with check (status in ('uploading', 'completed'));

create policy "Anyone can create files"
  on public.files for insert with check (true);

create policy "Anyone can read files"
  on public.files for select using (true);

-- Settings: only authenticated users (admin)
create policy "Authenticated users can read settings"
  on public.settings for select to authenticated using (true);

create policy "Authenticated users can update settings"
  on public.settings for update to authenticated using (true);

-- Download logs
create policy "Anyone can create download logs"
  on public.download_logs for insert with check (true);

create policy "Authenticated users can read download logs"
  on public.download_logs for select to authenticated using (true);

-- Admin full access
create policy "Authenticated users can manage transfers"
  on public.transfers for all to authenticated using (true);

create policy "Authenticated users can manage files"
  on public.files for all to authenticated using (true);

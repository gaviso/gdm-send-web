-- Add subject column to transfers
alter table public.transfers
  add column if not exists subject text not null default '';

-- Backfill existing rows with a generic subject so the not-null default is benign
update public.transfers set subject = 'File transfer' where subject = '';

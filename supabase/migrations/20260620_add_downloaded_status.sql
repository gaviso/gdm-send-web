-- Add 'downloaded' to the allowed transfer status values
alter table public.transfers drop constraint if exists transfers_status_check;
alter table public.transfers
  add constraint transfers_status_check
  check (status in ('uploading', 'completed', 'downloaded', 'expired', 'deleted'));

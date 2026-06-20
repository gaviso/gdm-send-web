-- Rename the 'completed' transfer status to 'received'
-- (admin/team has received the files; not the same as 'downloaded')

alter table public.transfers drop constraint if exists transfers_status_check;

update public.transfers set status = 'received' where status = 'completed';

alter table public.transfers
  add constraint transfers_status_check
  check (status in ('uploading', 'received', 'downloaded', 'expired', 'deleted'));

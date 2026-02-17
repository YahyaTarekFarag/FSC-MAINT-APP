alter table public.tickets
add column repair_duration integer null; -- Duration in minutes

comment on column public.tickets.repair_duration is 'Time taken to close the ticket in minutes (closed_at - started_at)';

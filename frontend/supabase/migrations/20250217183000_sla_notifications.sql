-- Phase 47: SLA Management & Notifications

-- 1. Create Notifications Table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text check (type in ('info', 'warning', 'success', 'error')) default 'info',
  is_read boolean default false,
  link text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table notifications enable row level security;

-- RLS Policies
create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications (mark as read)"
  on notifications for update
  using (auth.uid() = user_id);

-- 2. Add due_date to Tickets
alter table tickets 
add column if not exists due_date timestamp with time zone;

-- 3. SLA Trigger Function
create or replace function calculate_ticket_due_date()
returns trigger
language plpgsql
security definer
as $$
declare
  resolution_hours_val int;
begin
  -- Lookup resolution hours from sla_policies based on priority
  -- Assumes sla_policies table exists with priority_level and resolution_hours
  select resolution_hours into resolution_hours_val
  from sla_policies
  where priority_level = new.priority
  and is_active = true
  limit 1;

  -- Default to 24 hours if no policy found or priority is null
  if resolution_hours_val is null then
    resolution_hours_val := 24; 
  end if;

  -- Set due_date
  new.due_date := new.created_at + (resolution_hours_val || ' hours')::interval;

  return new;
end;
$$;

-- 4. Create Trigger
drop trigger if exists set_ticket_due_date on tickets;
create trigger set_ticket_due_date
  before insert on tickets
  for each row
  execute function calculate_ticket_due_date();

-- 5. Backfill existing tickets (Optional, but good for consistency)
-- updates existing open tickets where due_date is null
update tickets
set due_date = created_at + interval '24 hours'
where due_date is null and status != 'closed';

-- Create maintenance_schedules table
create table if not exists public.maintenance_schedules (
    id uuid not null default gen_random_uuid(),
    branch_id uuid not null references public.branches(id),
    title text not null,
    description text,
    frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    start_date date not null,
    next_run date not null,
    last_run date,
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
    is_active boolean not null default true,
    created_by uuid references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    constraint maintenance_schedules_pkey primary key (id)
);

-- RLS Policies
alter table public.maintenance_schedules enable row level security;

create policy "Enable read access for authenticated users"
on public.maintenance_schedules for select
to authenticated
using (true);

create policy "Enable write access for admins and managers"
on public.maintenance_schedules for all
to authenticated
using (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role in ('admin', 'manager')
    )
);

-- Function to generate scheduled tickets
create or replace function public.generate_scheduled_tickets()
returns integer
language plpgsql
security definer
as $$
declare
    schedule record;
    tickets_created integer := 0;
    new_ticket_id uuid;
begin
    -- Loop through active schedules that are due
    for schedule in 
        select * from public.maintenance_schedules
        where is_active = true
        and next_run <= current_date
    loop
        -- Insert new ticket
        insert into public.tickets (
            branch_id,
            status,
            priority,
            fault_category,
            description,
            created_at,
            updated_at
        ) values (
            schedule.branch_id,
            'open',
            schedule.priority::public.ticket_priority, -- Cast to enum if necessary, or text matching enum
            'Preventive Maintenance', -- or link to a specific category id if available
            schedule.title || E'\n' || coalesce(schedule.description, ''),
            now(),
            now()
        ) returning id into new_ticket_id;

        -- Update schedule next_run and last_run
        update public.maintenance_schedules
        set 
            last_run = current_date,
            next_run = case 
                when frequency = 'daily' then current_date + interval '1 day'
                when frequency = 'weekly' then current_date + interval '1 week'
                when frequency = 'monthly' then current_date + interval '1 month'
                when frequency = 'quarterly' then current_date + interval '3 months'
                when frequency = 'yearly' then current_date + interval '1 year'
            end,
            updated_at = now()
        where id = schedule.id;

        tickets_created := tickets_created + 1;
    end loop;

    return tickets_created;
end;
$$;

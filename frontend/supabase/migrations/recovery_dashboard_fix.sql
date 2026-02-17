-- Recovery Fix: Ensure required columns and RPCs for Dashboard Analytics exist
-- Run this in the Supabase SQL Editor

-- 1. Ensure repair_duration column exists
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='tickets' and column_name='repair_duration') then
    alter table public.tickets add column repair_duration integer null;
    comment on column public.tickets.repair_duration is 'Time taken to close the ticket in minutes (closed_at - started_at)';
  end if;
end $$;

-- 2. Ensure repair_cost column exists
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='tickets' and column_name='repair_cost') then
    alter table public.tickets add column repair_cost numeric null default 0;
  end if;
end $$;

-- 3. Ensure closed_at column exists (standard in schema but checking for safety)
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='tickets' and column_name='closed_at') then
    alter table public.tickets add column closed_at timestamp with time zone null;
  end if;
end $$;

-- 4. Re-create get_dashboard_stats with robust handling
create or replace function get_dashboard_stats(
  current_user_id uuid,
  period_start timestamp with time zone default (now() - interval '30 days'),
  period_end timestamp with time zone default now()
)
returns json
language plpgsql
security definer
as $$
declare
  total_tickets_count bigint;
  open_tickets_count bigint;
  in_progress_tickets_count bigint;
  completed_tickets_count bigint;
  avg_repair_time_minutes numeric;
  total_repair_costs numeric;
  top_faults json;
begin
  -- Total Tickets in Period
  select count(*) into total_tickets_count
  from tickets
  where created_at >= period_start and created_at <= period_end;

  -- Status Counts
  select count(*) into open_tickets_count
  from tickets
  where status = 'open' and created_at >= period_start and created_at <= period_end;

  select count(*) into in_progress_tickets_count
  from tickets
  where status = 'in_progress' and created_at >= period_start and created_at <= period_end;

  select count(*) into completed_tickets_count
  from tickets
  where status = 'closed' and created_at >= period_start and created_at <= period_end;

  -- Average Repair Time (for closed tickets in period)
  select avg(repair_duration) into avg_repair_time_minutes
  from tickets
  where status = 'closed' 
  and created_at >= period_start and created_at <= period_end
  and repair_duration is not null;

  -- Total Repair Costs
  select sum(repair_cost) into total_repair_costs
  from tickets
  where status = 'closed'
  and created_at >= period_start and created_at <= period_end;

  -- Top 5 Fault Types
  with fault_counts as (
    select fault_category as fault_type, count(*) as c
    from tickets
    where created_at >= period_start and created_at <= period_end
    group by fault_category
  )
  select json_agg(fc) into top_faults
  from (
    select fault_type, c
    from fault_counts
    order by c desc
    limit 5
  ) fc;

  return json_build_object(
    'total_tickets', coalesce(total_tickets_count, 0),
    'open_tickets', coalesce(open_tickets_count, 0),
    'in_progress_tickets', coalesce(in_progress_tickets_count, 0),
    'completed_tickets', coalesce(completed_tickets_count, 0),
    'avg_repair_time', round(coalesce(avg_repair_time_minutes, 0), 1),
    'total_cost', coalesce(total_repair_costs, 0),
    'top_faults', coalesce(top_faults, '[]'::json)
  );
end;
$$;

-- 5. Re-create get_technician_performance
create or replace function get_technician_performance(
  period_start timestamp with time zone default (now() - interval '30 days'),
  period_end timestamp with time zone default now()
)
returns table (
  technician_id uuid,
  full_name text,
  completed_tickets bigint,
  avg_repair_time numeric,
  total_cost numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    p.id as technician_id,
    p.full_name,
    count(t.id) as completed_tickets,
    round(avg(t.repair_duration), 1) as avg_repair_time,
    sum(t.repair_cost) as total_cost
  from profiles p
  join tickets t on t.technician_id = p.id
  where p.role = 'technician'
  and t.status = 'closed'
  and t.created_at >= period_start and t.created_at <= period_end
  group by p.id, p.full_name
  order by completed_tickets desc;
end;
$$;

-- 6. Ensure get_spending_trend exists
create or replace function get_spending_trend(
  current_user_id uuid,
  period_start timestamp with time zone,
  period_end timestamp with time zone
)
returns table (
  name text,
  repairs numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    to_char(closed_at, 'DD/MM') as name,
    sum(repair_cost) as repairs
  from tickets
  where status = 'closed'
  and closed_at >= period_start 
  and closed_at <= period_end
  group by to_char(closed_at, 'DD/MM'), date_trunc('day', closed_at)
  order by date_trunc('day', closed_at);
end;
$$;

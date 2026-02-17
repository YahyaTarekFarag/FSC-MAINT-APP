-- Analytics Dashboard RPCs

-- 1. Get Dashboard Stats (High-level KPIs)
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
    select fault_type, count(*) as c
    from tickets
    where created_at >= period_start and created_at <= period_end
    group by fault_type
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

-- 2. Get Technician Performance
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

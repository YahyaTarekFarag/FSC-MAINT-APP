-- Add get_spending_trend RPC
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

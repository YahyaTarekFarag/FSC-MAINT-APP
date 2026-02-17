-- Create a view to aggregate technician status, location, and workload
create or replace view public.technician_workload_view as
select 
    p.id as technician_id,
    p.full_name,
    p.created_at, -- just for some timestamp
    
    -- Current Shift Status (from last attendance log)
    coalesce(
        (select action_type 
         from public.attendance_logs 
         where user_id = p.id 
         order by timestamp desc 
         limit 1), 
        'check_out'
    ) as current_status,

    -- Last Known Location (from profile or last log)
    coalesce(p.last_lat, 
        (select location_lat 
         from public.attendance_logs 
         where user_id = p.id 
         order by timestamp desc 
         limit 1)
    ) as last_lat,
    coalesce(p.last_lng, 
        (select location_lng 
         from public.attendance_logs 
         where user_id = p.id 
         order by timestamp desc 
         limit 1)
    ) as last_lng,

    -- Active Ticket Count
    (select count(*) 
     from public.tickets t 
     where t.technician_id = p.id 
     and t.status = 'in_progress'
    ) as active_tickets

from public.profiles p
where p.role = 'technician'
and p.status = 'active';

comment on view public.technician_workload_view is 'Aggregated view of technician status, location, and current workload for smart scheduling.';

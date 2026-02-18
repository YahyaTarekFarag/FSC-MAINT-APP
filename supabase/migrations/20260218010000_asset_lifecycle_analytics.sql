-- Phase 54: Asset Lifecycle - Schema Extensions & Analytics

-- 1. Extend tickets for time tracking
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 2. Extend maintenance_assets for richer metadata
ALTER TABLE public.maintenance_assets
ADD COLUMN IF NOT EXISTS model_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_details TEXT,
ADD COLUMN IF NOT EXISTS technical_specs JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_maintenance_date TIMESTAMPTZ;

-- 3. Analytics RPC: get_asset_statistics
CREATE OR REPLACE FUNCTION get_asset_statistics(target_asset_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_repair_cost DECIMAL(12,2);
    part_costs DECIMAL(12,2);
    ticket_count INT;
    last_repair TIMESTAMPTZ;
    avg_downtime_hours DECIMAL(10,2);
BEGIN
    -- Calculate repair costs from tickets
    SELECT 
        COALESCE(SUM(repair_cost), 0),
        COUNT(*),
        MAX(closed_at)
    INTO 
        total_repair_cost,
        ticket_count,
        last_repair
    FROM tickets
    WHERE asset_id = target_asset_id;

    -- Calculate part costs from inventory transactions linked to those tickets
    SELECT 
        COALESCE(SUM(ABS(it.change_amount) * sp.price), 0)
    INTO 
        part_costs
    FROM inventory_transactions it
    JOIN spare_parts sp ON sp.id = it.part_id
    JOIN tickets t ON t.id = it.ticket_id
    WHERE t.asset_id = target_asset_id
      AND it.transaction_type = 'consumption';

    -- Calculate average downtime (hours)
    SELECT 
        COALESCE(AVG(EXTRACT(EPOCH FROM (closed_at - started_at)) / 3600), 0)
    INTO 
        avg_downtime_hours
    FROM tickets
    WHERE asset_id = target_asset_id 
      AND status = 'closed'
      AND started_at IS NOT NULL 
      AND closed_at IS NOT NULL;

    SELECT json_build_object(
        'total_repair_cost', total_repair_cost + part_costs,
        'ticket_count', ticket_count,
        'last_repair_date', last_repair,
        'avg_downtime_hours', ROUND(avg_downtime_hours::numeric, 2),
        'uptime_status', (SELECT status FROM maintenance_assets WHERE id = target_asset_id)
    ) INTO result;

    RETURN result;
END;
$$;

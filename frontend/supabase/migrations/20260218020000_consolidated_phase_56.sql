-- Consolidated Phase 56 Migration: Global Linking & Data Integrity

-- 1. Schema Updates for maintenance_assets
ALTER TABLE public.maintenance_assets
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.fault_categories(id), -- To link with parts category
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Physical' CHECK (type IN ('Physical', 'Virtual')),
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS model_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_details TEXT,
ADD COLUMN IF NOT EXISTS technical_specs JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_maintenance_date TIMESTAMPTZ;

-- 1.1 Update spare_parts to have category_id for compatibility validation
ALTER TABLE public.spare_parts
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.fault_categories(id);

-- 2. Schema Updates for tickets
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Ensure ticket asset link exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tickets_asset_id_fkey'
    ) THEN
        ALTER TABLE public.tickets
        ADD CONSTRAINT tickets_asset_id_fkey
        FOREIGN KEY (asset_id)
        REFERENCES public.maintenance_assets(id);
    END IF;
END $$;

-- 3. Create v_branch_performance View
DROP VIEW IF EXISTS public.v_branch_performance;

CREATE OR REPLACE VIEW public.v_branch_performance AS
SELECT 
    b.id as branch_id,
    b.name_ar as branch_name,
    COUNT(t.id) as total_tickets,
    COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_tickets,
    COALESCE(SUM(t.repair_cost), 0) as total_maintenance_cost,
    
    -- Avg Downtime (hours)
    COALESCE(
        AVG(EXTRACT(EPOCH FROM (COALESCE(t.closed_at, NOW()) - t.created_at))/3600)
    , 0)::NUMERIC(10,2) as avg_downtime_hours,
    
    -- Monthly Trend (JSON)
    COALESCE(
        (
            SELECT json_agg(months)
            FROM (
                SELECT 
                    to_char(created_at, 'YYYY-MM') as month,
                    COUNT(*) as count,
                    COALESCE(SUM(repair_cost), 0) as cost
                FROM tickets t2
                WHERE t2.branch_id = b.id
                GROUP BY 1
                ORDER BY 1 DESC
                LIMIT 12
            ) months
        ),
        '[]'::json
    ) as monthly_trend,

    -- Asset Health Score (Average for the branch)
    COALESCE(
        (
            SELECT AVG(
                GREATEST(0, 100 - (
                    (SELECT COUNT(*) FROM tickets t3 WHERE t3.asset_id = a.id) * 10 
                ))
            )::NUMERIC(5,2)
            FROM maintenance_assets a
            WHERE a.branch_id = b.id AND a.type = 'Physical'
        ),
        100
    ) as avg_asset_health_score

FROM branches b
LEFT JOIN tickets t ON t.branch_id = b.id
GROUP BY b.id;

-- 4. Analytics RPC: get_asset_statistics
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

-- 5. Data Migration: Create Virtual Assets and Link Orphaned Tickets
DO $$
DECLARE
    branch_rec RECORD;
    v_asset_id UUID;
BEGIN
    FOR branch_rec IN SELECT id, name_ar FROM branches LOOP
        -- Check if virtual asset exists
        SELECT id INTO v_asset_id FROM maintenance_assets 
        WHERE branch_id = branch_rec.id AND name = 'أصل افتراضي (بيانات قديمة)';
        
        IF v_asset_id IS NULL THEN
            INSERT INTO maintenance_assets (name, branch_id, status, type)
            VALUES ('أصل افتراضي (بيانات قديمة)', branch_rec.id, 'Active', 'Virtual')
            RETURNING id INTO v_asset_id;
        END IF;

        -- Link orphaned tickets (tickets with no asset_id)
        UPDATE tickets 
        SET asset_id = v_asset_id
        WHERE branch_id = branch_rec.id 
        AND asset_id IS NULL;
        
    END LOOP;
END $$;

-- Grant permissions
GRANT SELECT ON public.v_branch_performance TO authenticated;
GRANT SELECT ON public.v_branch_performance TO service_role;

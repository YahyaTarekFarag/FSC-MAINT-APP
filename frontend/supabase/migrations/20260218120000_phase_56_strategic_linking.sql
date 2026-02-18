-- Phase 56+: Strategic Linking (The Digital Thread)

-- 1. Add new columns to maintenance_assets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_assets' AND column_name = 'category_id') THEN
        ALTER TABLE maintenance_assets ADD COLUMN category_id UUID REFERENCES fault_categories(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_assets' AND column_name = 'purchase_price') THEN
        ALTER TABLE maintenance_assets ADD COLUMN purchase_price NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_assets' AND column_name = 'notes') THEN
        ALTER TABLE maintenance_assets ADD COLUMN notes TEXT;
    END IF;

    -- Add compatible_models to spare_parts if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spare_parts' AND column_name = 'compatible_models') THEN
        ALTER TABLE spare_parts ADD COLUMN compatible_models TEXT;
    END IF;
END $$;

-- 2. Create View: v_branch_performance
DROP VIEW IF EXISTS v_branch_performance;

CREATE OR REPLACE VIEW v_branch_performance AS
WITH branch_stats AS (
    SELECT 
        b.id AS branch_id,
        b.name_ar AS branch_name,
        COUNT(t.id) AS total_tickets,
        COUNT(CASE WHEN t.status IN ('closed', 'resolved') THEN 1 END) AS closed_tickets,
        COALESCE(SUM(t.repair_cost), 0) AS total_maintenance_cost,
        ROUND(AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at))/3600)::numeric, 1) AS avg_downtime_hours,
        -- Health score: 100 - (Ticket Count * 2) - (Cost factor)
        GREATEST(0, 100 - (COUNT(t.id) * 2) - (COALESCE(SUM(t.repair_cost), 0) / 1000)) AS avg_asset_health_score
    FROM 
        branches b
    LEFT JOIN 
        tickets t ON b.id = t.branch_id
    GROUP BY 
        b.id, b.name_ar
),
monthly_metrics AS (
    SELECT
        branch_id,
        TO_CHAR(created_at, 'YYYY-MM') AS month_key,
        COUNT(*) AS count,
        COALESCE(SUM(repair_cost), 0) AS cost
    FROM
        tickets
    GROUP BY
        branch_id, TO_CHAR(created_at, 'YYYY-MM')
),
trends AS (
    SELECT
        branch_id,
        jsonb_agg(
            jsonb_build_object(
                'month', month_key,
                'count', count,
                'cost', cost
            ) ORDER BY month_key DESC
        ) AS monthly_trend
    FROM
        monthly_metrics
    GROUP BY
        branch_id
)
SELECT
    bs.*,
    COALESCE(tr.monthly_trend, '[]'::jsonb) AS monthly_trend
FROM
    branch_stats bs
LEFT JOIN
    trends tr ON bs.branch_id = tr.branch_id;

-- 3. Legacy Asset Migration (Script)
-- Creates a "Generic Asset" for each branch if it doesn't exist
DO $$
DECLARE
    branch_rec RECORD;
    generic_asset_id UUID;
BEGIN
    FOR branch_rec IN SELECT id FROM branches LOOP
        -- Check if generic asset exists for this branch
        SELECT id INTO generic_asset_id 
        FROM maintenance_assets 
        WHERE branch_id = branch_rec.id AND name = 'أصل عام (Generic)' LIMIT 1;

        -- If not, create it
        IF generic_asset_id IS NULL THEN
            INSERT INTO maintenance_assets (branch_id, name, status, notes)
            VALUES (branch_rec.id, 'أصل عام (Generic)', 'Active', 'Created for legacy tickets compatibility')
            RETURNING id INTO generic_asset_id;
        END IF;

        -- Update NULL tickets
        UPDATE tickets 
        SET asset_id = generic_asset_id
        WHERE branch_id = branch_rec.id AND asset_id IS NULL;
    END LOOP;
END $$;

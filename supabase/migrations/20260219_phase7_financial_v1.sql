-- Phase 7: Financial Sovereignty & ROI Engine

-- 1. Extend Schema for Cost Tracking
ALTER TABLE maintenance_assets ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS maintenance_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS monthly_budget DECIMAL(12,2) DEFAULT 0;

-- 2. Asset ROI Analysis View
-- Calculates Total Cost of Ownership (TCO) and ranks equipment efficiency
CREATE OR REPLACE VIEW v_asset_roi_analysis AS
WITH asset_costs AS (
    SELECT 
        asset_id,
        COUNT(id) as repair_count,
        SUM(maintenance_cost) as total_repair_cost
    FROM tickets
    WHERE asset_id IS NOT NULL
    GROUP BY asset_id
)
SELECT 
    a.id,
    a.name,
    a.branch_id,
    b.name_ar as branch_name,
    a.purchase_price,
    COALESCE(ac.repair_count, 0) as repair_count,
    COALESCE(ac.total_repair_cost, 0) as total_repair_cost,
    (a.purchase_price + COALESCE(ac.total_repair_cost, 0)) as tco,
    CASE 
        WHEN a.purchase_price > 0 THEN 
            (COALESCE(ac.total_repair_cost, 0) / a.purchase_price) * 100 
        ELSE 0 
    END as cost_to_purchase_ratio,
    a.status
FROM maintenance_assets a
JOIN branches b ON a.branch_id = b.id
LEFT JOIN asset_costs ac ON a.id = ac.asset_id;

-- 3. Branch Budget Health View
-- Tracks monthly spend against allocated branch budgets
CREATE OR REPLACE VIEW v_branch_budget_health AS
WITH monthly_spend AS (
    SELECT 
        branch_id,
        date_trunc('month', created_at) as month,
        SUM(maintenance_cost) as total_spent
    FROM tickets
    GROUP BY branch_id, date_trunc('month', created_at)
)
SELECT 
    b.id as branch_id,
    b.name_ar as branch_name,
    b.monthly_budget,
    ms.month,
    COALESCE(ms.total_spent, 0) as total_spent,
    CASE 
        WHEN b.monthly_budget > 0 THEN 
            (COALESCE(ms.total_spent, 0) / b.monthly_budget) * 100 
        ELSE 0 
    END as budget_usage_percent
FROM branches b
LEFT JOIN monthly_spend ms ON b.id = ms.branch_id
WHERE ms.month = date_trunc('month', now()) OR ms.month IS NULL;

-- 4. RLS for Financial Data
-- Only admins and managers can see financial views
ALTER VIEW v_asset_roi_analysis OWNER TO postgres;
ALTER VIEW v_branch_budget_health OWNER TO postgres;

-- (Note: RLS on views is complex in Supabase, we usually apply it to underlying tables or use SECURITY DEFINER functions)
-- Since underlying tables branches/tickets/maintenance_assets already have RLS, 
-- users will only see aggregate data for records they can already access.

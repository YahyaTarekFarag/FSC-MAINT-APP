-- Phase 3: Sovereign Analytics Views

-- 0. Ensure Schema Integrity (Patching Phase 1/2 mismatches)
ALTER TABLE public.spare_parts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 1. Inventory Health View
-- Focus: Stock levels, valuation, and threshold analysis
CREATE OR REPLACE VIEW v_inventory_health AS
SELECT 
    id,
    name_ar,
    part_number,
    quantity,
    min_threshold,
    price,
    (quantity * price) as total_valuation,
    CASE 
        WHEN quantity <= 0 THEN 'OUT_OF_STOCK'
        WHEN quantity <= min_threshold THEN 'LOW_STOCK'
        ELSE 'OPTIMAL'
    END as health_status,
    CASE 
        WHEN min_threshold > 0 THEN (quantity::float / min_threshold::float) * 100
        ELSE 100
    END as stock_percentage
FROM spare_parts
WHERE is_active = true;

-- 2. Technician Performance View
-- Focus: Efficiency, workload, and resolution quality
CREATE OR REPLACE VIEW v_technician_performance AS
SELECT 
    p.id as technician_id,
    p.full_name,
    p.specialization,
    COUNT(t.id) as total_tickets,
    COUNT(t.id) FILTER (WHERE t.status = 'closed') as resolved_tickets,
    AVG(EXTRACT(EPOCH FROM (t.closed_at - t.started_at)) / 3600) FILTER (WHERE t.status = 'closed' AND t.started_at IS NOT NULL) as avg_resolution_hours,
    SUM(t.repair_cost) FILTER (WHERE t.status = 'closed') as total_generated_cost
FROM profiles p
LEFT JOIN tickets t ON p.id = t.technician_id
WHERE p.role = 'technician'
GROUP BY p.id, p.full_name, p.specialization;

-- 3. Branch Maintenance Trend View
-- Focus: Time-series analysis of spending per branch
CREATE OR REPLACE VIEW v_branch_maintenance_trend AS
SELECT 
    b.id as branch_id,
    b.name_ar as branch_name,
    date_trunc('month', t.created_at) as month,
    COUNT(t.id) as ticket_count,
    SUM(t.repair_cost) as monthly_cost
FROM branches b
JOIN tickets t ON b.id = t.branch_id
WHERE t.status IN ('resolved', 'closed')
GROUP BY b.id, b.name_ar, date_trunc('month', t.created_at)
ORDER BY month DESC;

-- 4. Global Maintenance Metrics (KPIs)
CREATE OR REPLACE VIEW v_sovereign_kpis AS
SELECT
    (SELECT COUNT(*) FROM tickets WHERE status = 'open') as open_tickets,
    (SELECT COUNT(*) FROM spare_parts WHERE quantity <= min_threshold AND is_active = true) as low_stock_items,
    (SELECT SUM(repair_cost) FROM tickets WHERE created_at >= date_trunc('month', now())) as monthly_spending,
    (SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600) FROM tickets WHERE status = 'closed') as avg_cycle_time;

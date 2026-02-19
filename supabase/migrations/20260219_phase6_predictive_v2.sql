-- Phase 6: Deep Predictive Analytics Integration

-- 1. Helper function to calculate MTBF (Mean Time Between Failures) per Asset Type/Brand
-- This calculates the average difference in days between tickets for the same asset
CREATE OR REPLACE VIEW v_asset_mtbf_stats AS
WITH ticket_intervals AS (
    SELECT 
        asset_id,
        created_at as ticket_date,
        LAG(created_at) OVER (PARTITION BY asset_id ORDER BY created_at) as prev_ticket_date
    FROM tickets
    WHERE asset_id IS NOT NULL
),
diffs AS (
    SELECT 
        asset_id,
        EXTRACT(DAY FROM (ticket_date - prev_ticket_date)) as days_between
    FROM ticket_intervals
    WHERE prev_ticket_date IS NOT NULL
)
SELECT 
    asset_id,
    AVG(days_between)::DECIMAL(10,2) as avg_mtbf_days,
    COUNT(*) as failure_cycles
FROM diffs
GROUP BY asset_id;

-- 2. Brand Reliability Scoring
-- Ranks brands based on frequency of tickets and average downtime
CREATE OR REPLACE VIEW v_brand_reliability_analysis AS
SELECT 
    b.id as brand_id,
    b.name_ar as brand_name,
    COUNT(t.id) as total_incidents,
    COUNT(DISTINCT ma.id) as total_assets,
    (COUNT(t.id)::FLOAT / NULLIF(COUNT(DISTINCT ma.id), 0))::DECIMAL(10,2) as failure_rate_per_unit,
    AVG(amt.avg_mtbf_days)::DECIMAL(10,2) as brand_mtbf_avg
FROM brands b
LEFT JOIN maintenance_assets ma ON ma.brand_id = b.id
LEFT JOIN tickets t ON t.asset_id = ma.id
LEFT JOIN v_asset_mtbf_stats amt ON amt.asset_id = ma.id
GROUP BY b.id, b.name_ar;

-- 3. The Forecast Engine: Projected Outage Date
-- Predicts the next failure date based on last ticket date + MTBF
CREATE OR REPLACE VIEW v_maintenance_forecasts AS
WITH last_events AS (
    SELECT 
        asset_id,
        MAX(created_at) as last_failure_date
    FROM tickets
    WHERE asset_id IS NOT NULL
    GROUP BY asset_id
)
SELECT 
    ma.id as asset_id,
    ma.name as asset_name,
    ma.branch_id,
    br.name_ar as brand_name,
    br.id as brand_id,
    le.last_failure_date,
    amt.avg_mtbf_days,
    (le.last_failure_date + (COALESCE(amt.avg_mtbf_days, 180) * INTERVAL '1 day'))::DATE as projected_failure_date,
    EXTRACT(DAY FROM ((le.last_failure_date + (COALESCE(amt.avg_mtbf_days, 180) * INTERVAL '1 day')) - NOW())) as days_until_failure,
    CASE 
        WHEN EXTRACT(DAY FROM ((le.last_failure_date + (COALESCE(amt.avg_mtbf_days, 180) * INTERVAL '1 day')) - NOW())) < 7 THEN 'CRITICAL'
        WHEN EXTRACT(DAY FROM ((le.last_failure_date + (COALESCE(amt.avg_mtbf_days, 180) * INTERVAL '1 day')) - NOW())) < 14 THEN 'URGENT'
        WHEN EXTRACT(DAY FROM ((le.last_failure_date + (COALESCE(amt.avg_mtbf_days, 180) * INTERVAL '1 day')) - NOW())) < 30 THEN 'PROACTIVE'
        ELSE 'STABLE'
    END as forecast_status
FROM maintenance_assets ma
JOIN brands br ON br.id = ma.brand_id
LEFT JOIN last_events le ON le.asset_id = ma.id
LEFT JOIN v_asset_mtbf_stats amt ON amt.asset_id = ma.id
WHERE ma.status = 'Active';

-- 4. Advanced Operational Heatmap View
-- Combines current load + predictive load + stock risk
CREATE OR REPLACE VIEW v_operational_risk_heatmap AS
SELECT 
    b.id as branch_id,
    b.name_ar as branch_name,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as open_tickets,
    COUNT(DISTINCT f.asset_id) FILTER (WHERE f.forecast_status IN ('CRITICAL', 'URGENT')) as projected_failures,
    (SELECT COUNT(*) FROM spare_parts WHERE quantity <= min_threshold AND is_active = true) as stock_alerts,
    (
        COUNT(DISTINCT t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) * 2 +
        COUNT(DISTINCT f.asset_id) FILTER (WHERE f.forecast_status IN ('CRITICAL', 'URGENT')) * 3 +
        (SELECT COUNT(*) FROM spare_parts WHERE quantity <= min_threshold AND is_active = true) * 1.5
    )::DECIMAL(10,2) as aggregate_risk_score
FROM branches b
LEFT JOIN tickets t ON t.branch_id = b.id
LEFT JOIN v_maintenance_forecasts f ON f.asset_id = t.asset_id
GROUP BY b.id, b.name_ar;

-- Explicitly allow access to these intelligence views
GRANT SELECT ON v_asset_mtbf_stats TO authenticated;
GRANT SELECT ON v_brand_reliability_analysis TO authenticated;
GRANT SELECT ON v_maintenance_forecasts TO authenticated;
GRANT SELECT ON v_operational_risk_heatmap TO authenticated;

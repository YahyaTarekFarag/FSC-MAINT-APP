-- Create v_branch_performance view

DROP VIEW IF EXISTS v_branch_performance;

CREATE OR REPLACE VIEW v_branch_performance AS
SELECT 
    b.id as branch_id,
    b.name_ar as branch_name,
    COUNT(t.id) as total_tickets,
    COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_tickets,
    COALESCE(SUM(t.repair_cost), 0) as total_maintenance_cost,
    AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at))/3600)::NUMERIC(10,2) as avg_downtime_hours,
    
    -- Monthly Trend (JSON)
    (
        SELECT json_agg(months)
        FROM (
            SELECT 
                to_char(created_at, 'YYYY-MM') as month,
                COUNT(*) as count,
                SUM(repair_cost) as cost
            FROM tickets t2
            WHERE t2.branch_id = b.id
            GROUP BY 1
            ORDER BY 1 DESC
            LIMIT 12
        ) months
    ) as monthly_trend,

    -- Asset Health Score (Average for the branch)
    -- Formula: Average of (100 - (Tickets per asset * 10))
    -- We assume standard score start at 100. Each ticket reduces it.
    (
        SELECT AVG(
            GREATEST(0, 100 - (
                (SELECT COUNT(*) FROM tickets t3 WHERE t3.asset_id = a.id) * 10 
            ))
        )::NUMERIC(5,2)
        FROM maintenance_assets a
        WHERE a.branch_id = b.id AND a.type = 'Physical'
    ) as avg_asset_health_score

FROM branches b
LEFT JOIN tickets t ON t.branch_id = b.id
GROUP BY b.id;

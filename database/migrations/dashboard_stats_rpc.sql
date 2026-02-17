-- ============================================
-- RPC: get_dashboard_stats()
-- Real-time analytics aggregation for the
-- Executive Dashboard (DashboardAnalytics.tsx)
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        -- 1. Total Spend: Sum of repair_cost + sum of (quantity * price) from inventory_transactions
        'total_spend', (
            SELECT COALESCE(SUM(repair_cost), 0)
            FROM tickets
            WHERE closed_at >= date_trunc('year', now())
        ) + (
            SELECT COALESCE(SUM(ABS(it.change_amount) * sp.price), 0)
            FROM inventory_transactions it
            JOIN spare_parts sp ON sp.id = it.part_id
            WHERE it.transaction_type = 'consumption'
              AND it.created_at >= date_trunc('year', now())
        ),

        -- 2. Average Efficiency: Days between created_at and closed_at
        'avg_efficiency_days', (
            SELECT ROUND(
                COALESCE(
                    AVG(EXTRACT(EPOCH FROM (closed_at::timestamp - created_at::timestamp)) / 86400.0),
                    0
                )::numeric,
                1
            )
            FROM tickets
            WHERE status = 'closed' AND closed_at IS NOT NULL
              AND closed_at >= now() - interval '90 days'
        ),

        -- 3. Critical Faults (open urgent tickets)
        'critical_faults', (
            SELECT COUNT(*)
            FROM tickets
            WHERE priority = 'urgent' AND status != 'closed'
        ),

        -- 4. Inventory Alerts (low stock)
        'inventory_alerts', (
            SELECT COUNT(*)
            FROM spare_parts
            WHERE quantity <= minimum_stock
        ),

        -- 5. Fault Distribution by category
        'fault_distribution', (
            SELECT COALESCE(json_agg(row_to_json(fd)), '[]'::json)
            FROM (
                SELECT
                    COALESCE(fc.name_ar, t.fault_category) AS name,
                    COUNT(*) AS value
                FROM tickets t
                LEFT JOIN fault_categories fc ON fc.id::text = t.category_id::text
                GROUP BY COALESCE(fc.name_ar, t.fault_category)
                ORDER BY COUNT(*) DESC
                LIMIT 8
            ) fd
        ),

        -- 6. Monthly Spending Trend (last 7 months)
        'spending_trend', (
            SELECT COALESCE(json_agg(row_to_json(st) ORDER BY st.month_date), '[]'::json)
            FROM (
                SELECT
                    to_char(date_trunc('month', closed_at), 'YYYY-MM') AS month_date,
                    to_char(date_trunc('month', closed_at), 'TMMonth') AS name,
                    COALESCE(SUM(repair_cost), 0)::integer AS repairs
                FROM tickets
                WHERE status = 'closed' AND closed_at IS NOT NULL
                  AND closed_at >= now() - interval '7 months'
                GROUP BY date_trunc('month', closed_at)
                ORDER BY date_trunc('month', closed_at)
            ) st
        )
    ) INTO result;

    RETURN result;
END;
$$;

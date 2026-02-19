-- Phase 4: The All-Seeing Eye (Analytics & Reporting)

-- Ensure standard completion columns exist in tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES public.profiles(id);

-- Ensure inventory_transactions table is standardized
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS change_amount INTEGER DEFAULT 0;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.inventory(id);

-- 1. View: Branch Performance
CREATE OR REPLACE VIEW public.view_branch_performance AS
SELECT 
    b.id as branch_id,
    b.name_ar as branch_name,
    COUNT(t.id) as ticket_count,
    COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')) as resolved_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, t.completed_at, t.closed_at, t.created_at) - t.created_at)) / 3600)::DECIMAL(10,2) as avg_resolution_time_hours,
    COALESCE(SUM(ABS(COALESCE(it.quantity, it.change_amount, 0)) * i.price), 0) as total_spare_parts_cost
FROM public.branches b
LEFT JOIN public.tickets t ON t.branch_id = b.id
LEFT JOIN public.inventory_transactions it ON it.ticket_id = t.id
LEFT JOIN public.inventory i ON i.id = it.item_id
GROUP BY b.id, b.name_ar;

-- 2. View: Technician Performance
CREATE OR REPLACE VIEW public.view_technician_performance AS
SELECT 
    p.id as technician_id,
    p.full_name as technician_name,
    COUNT(t.id) as tickets_assigned,
    COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')) as tickets_resolved,
    CASE 
        WHEN COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')) = 0 THEN 0
        ELSE (COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed') AND COALESCE(t.resolved_at, t.completed_at, t.closed_at) <= t.created_at + interval '48 hours')::FLOAT / 
              NULLIF(COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')), 0) * 100)::DECIMAL(5,2)
    END as compliance_rate
FROM public.profiles p
LEFT JOIN public.tickets t ON COALESCE(t.assigned_to, t.technician_id) = p.id
WHERE p.role = 'technician'
GROUP BY p.id, p.full_name;

-- 3. Security: Grant permissions (Views inherit RLS from base tables in some drivers, but explicit grants are safer for admin access)
GRANT SELECT ON public.view_branch_performance TO authenticated;
GRANT SELECT ON public.view_technician_performance TO authenticated;

-- 4. Schema Evolution: dashboard_analytics_v1
INSERT INTO public.ui_schemas (form_key, schema_definition)
VALUES (
    'dashboard_analytics_v1',
    '{
        "title": "لوحة التحليلات السيادية",
        "layout": "grid",
        "widgets": [
            { 
                "id": "cost_kpi", 
                "type": "kpi_card", 
                "title": "إجمالي تكلفة قطع الغيار", 
                "view": "view_branch_performance", 
                "column": "total_spare_parts_cost", 
                "agg": "sum", 
                "format": "currency",
                "icon": "DollarSign"
            },
            { 
                "id": "tickets_kpi", 
                "type": "kpi_card", 
                "title": "البلاغات المكتملة", 
                "view": "view_branch_performance", 
                "column": "resolved_count", 
                "agg": "sum", 
                "format": "number",
                "icon": "CheckCircle"
            },
            { 
                "id": "tickets_bar", 
                "type": "bar_chart", 
                "title": "الأعطال لكل فرع", 
                "view": "view_branch_performance", 
                "xKey": "branch_name", 
                "yKey": "ticket_count", 
                "color": "#3b82f6" 
            },
            { 
                "id": "compliance_radar", 
                "type": "bar_chart", 
                "title": "معدل امتثال الفنيين (%)", 
                "view": "view_technician_performance", 
                "xKey": "technician_name", 
                "yKey": "compliance_rate", 
                "color": "#10b981" 
            },
            { 
                "id": "status_pie", 
                "type": "pie_chart", 
                "title": "توزيع حالات التذاكر", 
                "view": "tickets", 
                "groupKey": "status", 
                "countKey": "id" 
            }
        ]
    }'::jsonb
) ON CONFLICT (form_key) DO UPDATE 
SET schema_definition = EXCLUDED.schema_definition;

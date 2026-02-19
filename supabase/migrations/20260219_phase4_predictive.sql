-- Phase 4: Sovereign Predictive Infrastructure

-- 1. Create maintenance_schedules table
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id),
    asset_id UUID REFERENCES public.maintenance_assets(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    last_run DATE,
    next_run DATE NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for schedules
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view schedules" ON public.maintenance_schedules;
CREATE POLICY "Authenticated users can view schedules" ON public.maintenance_schedules
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and Managers can manage schedules" ON public.maintenance_schedules;
CREATE POLICY "Admins and Managers can manage schedules" ON public.maintenance_schedules
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- 2. Predictive Asset Health View
-- Calculates "Risk Level" based on days since last maintenance vs frequency
CREATE OR REPLACE VIEW v_predictive_asset_health AS
WITH asset_metrics AS (
    SELECT 
        ma.id as asset_id,
        ma.name as asset_name,
        ma.status,
        ms.frequency,
        ms.next_run,
        COALESCE(ma.last_maintenance_date, ma.created_at) as last_serviced,
        EXTRACT(DAY FROM (NOW() - COALESCE(ma.last_maintenance_date, ma.created_at))) as days_since_service
    FROM maintenance_assets ma
    LEFT JOIN maintenance_schedules ms ON ma.id = ms.asset_id
)
SELECT 
    *,
    CASE 
        WHEN status = 'Under Repair' THEN 'CRITICAL'
        WHEN days_since_service > 180 THEN 'HIGH_RISK'
        WHEN days_since_service > 90 THEN 'MODERATE_RISK'
        ELSE 'HEATLH_OPTIMAL'
    END as risk_score,
    CASE 
        WHEN frequency = 'monthly' THEN GREATEST(0, (30 - days_since_service)::float / 30 * 100)
        WHEN frequency = 'quarterly' THEN GREATEST(0, (90 - days_since_service)::float / 90 * 100)
        WHEN frequency = 'yearly' THEN GREATEST(0, (365 - days_since_service)::float / 365 * 100)
        ELSE 100 
    END as health_percentage
FROM asset_metrics;

-- 3. Upcoming Maintenance View
CREATE OR REPLACE VIEW v_upcoming_maintenance AS
SELECT 
    ms.id,
    ms.title,
    ms.next_run,
    ms.priority,
    ma.name as asset_name,
    b.name_ar as branch_name
FROM maintenance_schedules ms
JOIN branches b ON b.id = ms.branch_id
LEFT JOIN maintenance_assets ma ON ma.id = ms.asset_id
WHERE ms.next_run >= CURRENT_DATE 
AND ms.next_run <= (CURRENT_DATE + INTERVAL '30 days')
AND ms.is_active = true
ORDER BY ms.next_run ASC;

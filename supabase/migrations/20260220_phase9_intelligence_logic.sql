-- Phase 9: PM Intelligence & Automation Logic

BEGIN;

-- 1. PM Intelligence Gap View
-- Detects "High Risk" assets that DON'T have an active maintenance schedule
CREATE OR REPLACE VIEW public.v_pm_intelligence_gap AS
SELECT 
    mf.asset_id,
    mf.asset_name,
    mf.brand_name,
    mf.branch_id,
    b.name_ar as branch_name,
    mf.days_until_failure,
    mf.forecast_status,
    mf.projected_failure_date
FROM public.v_maintenance_forecasts mf
JOIN public.branches b ON b.id = mf.branch_id
LEFT JOIN public.maintenance_schedules ms ON ms.asset_id = mf.asset_id AND ms.is_active = true
WHERE ms.id IS NULL
AND mf.forecast_status IN ('CRITICAL', 'URGENT', 'PROACTIVE');

-- 2. Refined Scheduled Ticket Generation
-- Ensures PM tickets are created with intelligence-backed metadata
CREATE OR REPLACE FUNCTION public.generate_scheduled_tickets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    schedule record;
    tickets_created integer := 0;
    new_ticket_id uuid;
    pm_category_id uuid;
    v_forecast record;
    v_priority public.ticket_priority;
BEGIN
    -- Ensure "صيانة وقائية" Category exists
    SELECT id INTO pm_category_id 
    FROM public.fault_categories 
    WHERE name_ar = 'صيانة وقائية' 
    LIMIT 1;

    IF pm_category_id IS NULL THEN
        INSERT INTO public.fault_categories (name_ar, name_en, is_active)
        VALUES ('صيانة وقائية', 'Preventive Maintenance', true)
        RETURNING id INTO pm_category_id;
    END IF;

    -- Loop through active schedules that are due
    FOR schedule IN 
        SELECT * FROM public.maintenance_schedules
        WHERE is_active = true
        AND next_run <= CURRENT_DATE
    LOOP
        -- Intelligence Lookup: Check if there's a critical forecast for this asset
        SELECT * INTO v_forecast 
        FROM public.v_maintenance_forecasts 
        WHERE asset_id = schedule.asset_id;

        -- Elevate priority if forecast is CRITICAL
        v_priority := schedule.priority::public.ticket_priority;
        IF v_forecast.forecast_status = 'CRITICAL' THEN
            v_priority := 'urgent';
        END IF;

        -- Insert new ticket
        INSERT INTO public.tickets (
            branch_id,
            asset_id,
            status,
            priority,
            fault_category,
            category_id,
            description,
            created_at,
            updated_at
        ) VALUES (
            schedule.branch_id,
            schedule.asset_id,
            'open',
            v_priority,
            'صيانة وقائية مبرمجة',
            pm_category_id,
            COALESCE(schedule.title, 'صيانة وقائية') || E'\n' || 
            COALESCE(schedule.description, '') || E'\n' ||
            CASE WHEN v_forecast.asset_id IS NOT NULL 
                 THEN 'تحليل الذكاء: التاريخ المتوقع للفشل ' || v_forecast.projected_failure_date
                 ELSE '' END,
            NOW(),
            NOW()
        ) RETURNING id INTO new_ticket_id;

        -- Update schedule cycle
        UPDATE public.maintenance_schedules
        SET 
            last_run = CURRENT_DATE,
            next_run = CASE 
                WHEN frequency = 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
                WHEN frequency = 'weekly' THEN CURRENT_DATE + INTERVAL '1 week'
                WHEN frequency = 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
                WHEN frequency = 'quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
                WHEN frequency = 'yearly' THEN CURRENT_DATE + INTERVAL '1 year'
                ELSE CURRENT_DATE + INTERVAL '1 month' 
            END,
            updated_at = NOW()
        WHERE id = schedule.id;

        tickets_created := tickets_created + 1;
    END LOOP;

    RETURN tickets_created;
END;
$$;

-- Grant access
GRANT SELECT ON public.v_pm_intelligence_gap TO authenticated;

COMMIT;

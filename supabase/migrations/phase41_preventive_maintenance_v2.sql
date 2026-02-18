-- Phase 41: Preventive Maintenance V2 - Asset Integration & Category Standardization

-- 1. Add asset_id to maintenance_schedules
ALTER TABLE public.maintenance_schedules
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.maintenance_assets(id) ON DELETE SET NULL;

-- 2. Ensure "صيانة وقائية" Category exists and get its ID
-- We'll do this via a script or handle it in the RPC to be safe.
-- For the migration, we'll just ensure the column is ready.

-- 3. Update generate_scheduled_tickets RPC
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
BEGIN
    -- Get or create the Preventive Maintenance category
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
            schedule.priority::public.ticket_priority,
            'صيانة وقائية',
            pm_category_id,
            COALESCE(schedule.title, '') || E'\n' || COALESCE(schedule.description, ''),
            NOW(),
            NOW()
        ) RETURNING id INTO new_ticket_id;

        -- Update schedule next_run and last_run
        UPDATE public.maintenance_schedules
        SET 
            last_run = CURRENT_DATE,
            next_run = CASE 
                WHEN frequency = 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
                WHEN frequency = 'weekly' THEN CURRENT_DATE + INTERVAL '1 week'
                WHEN frequency = 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
                WHEN frequency = 'quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
                WHEN frequency = 'yearly' THEN CURRENT_DATE + INTERVAL '1 year'
                ELSE CURRENT_DATE + INTERVAL '1 month' -- fallback
            END,
            updated_at = NOW()
        WHERE id = schedule.id;

        tickets_created := tickets_created + 1;
    END LOOP;

    RETURN tickets_created;
END;
$$;

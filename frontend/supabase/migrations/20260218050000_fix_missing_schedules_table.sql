-- 1. Create maintenance_schedules if it doesn't exist
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id),
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    next_run DATE NOT NULL,
    last_run DATE,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add asset_id column if it doesn't exist (Link to Assets)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_schedules' AND column_name = 'asset_id') THEN
        ALTER TABLE public.maintenance_schedules ADD COLUMN asset_id UUID REFERENCES public.maintenance_assets(id);
    END IF;
END $$;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_asset_id ON public.maintenance_schedules(asset_id);

-- 4. Enable RLS and Policies
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.maintenance_schedules;
CREATE POLICY "Enable read access for authenticated users" ON public.maintenance_schedules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable write access for admins and managers" ON public.maintenance_schedules;
CREATE POLICY "Enable write access for admins and managers" ON public.maintenance_schedules FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager'))
);

-- 5. Updated Function to generate tickets (including Asset Link)
CREATE OR REPLACE FUNCTION public.generate_scheduled_tickets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    schedule record;
    tickets_created integer := 0;
    new_ticket_id uuid;
BEGIN
    FOR schedule IN
        SELECT * FROM public.maintenance_schedules
        WHERE is_active = true
        AND next_run <= current_date
    LOOP
        INSERT INTO public.tickets (
            branch_id,
            asset_id, -- Link Ticket to Asset
            status,
            priority,
            fault_category,
            description,
            created_at,
            updated_at
        ) VALUES (
            schedule.branch_id,
            schedule.asset_id,
            'open',
            schedule.priority, -- Assuming text compatible or cast if needed
            'Preventive Maintenance',
            schedule.title || E'\n' || coalesce(schedule.description, ''),
            now(),
            now()
        ) RETURNING id INTO new_ticket_id;

        UPDATE public.maintenance_schedules
        SET
            last_run = current_date,
            next_run = CASE
                WHEN frequency = 'daily' THEN current_date + interval '1 day'
                WHEN frequency = 'weekly' THEN current_date + interval '1 week'
                WHEN frequency = 'monthly' THEN current_date + interval '1 month'
                WHEN frequency = 'quarterly' THEN current_date + interval '3 months'
                WHEN frequency = 'yearly' THEN current_date + interval '1 year'
            END,
            updated_at = now()
        WHERE id = schedule.id;

        tickets_created := tickets_created + 1;
    END LOOP;

    RETURN tickets_created;
END;
$$;

-- Phase 58: Admin Sovereignty & Dynamic Configuration

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies for system_settings (Admin only for write, Authenticated for read)
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can read system settings" ON public.system_settings
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Insert default settings
INSERT INTO public.system_settings (key, value, description)
VALUES
    ('geofence_config', '{
        "radius_meters": 200,
        "technician_visibility_km": 80
    }'::jsonb, 'Geofencing configuration for attendance and technician tracking'),
    ('sla_policies', '{
        "low": 48,
        "medium": 24,
        "high": 8,
        "emergency": 4
    }'::jsonb, 'Service Level Agreement (SLA) hours per priority level')
ON CONFLICT (key) DO NOTHING;

-- 2. Update Fault Categories for Dynamic Diagnostics
ALTER TABLE public.fault_categories
ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb, -- Array of {id, text, type, options}
ADD COLUMN IF NOT EXISTS compatible_part_types JSONB DEFAULT '[]'::jsonb; -- Array of allowed part types

-- 3. Ensure Admin Control on Categories
-- We assume RLS is enabled on fault_categories. Adding explicit admin policies if needed.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fault_categories' AND policyname = 'Admins can manage categories'
    ) THEN
        CREATE POLICY "Admins can manage categories" ON public.fault_categories
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;

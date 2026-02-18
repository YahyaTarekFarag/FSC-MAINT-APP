-- Safely create or update system_settings table
-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Add 'category' column if it doesn't exist (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'category') THEN
        ALTER TABLE system_settings ADD COLUMN category TEXT NOT NULL DEFAULT 'general';
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Drop first to avoid conflicts if re-running)
DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can insert system settings" ON system_settings;

CREATE POLICY "Everyone can view system settings"
    ON system_settings FOR SELECT
    USING (true);

CREATE POLICY "Admins can update system settings"
    ON system_settings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert system settings"
    ON system_settings FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 5. Insert Default Settings
INSERT INTO system_settings (key, value, description, category)
VALUES
    ('app_config', '{"maintenance_mode": false, "allow_registrations": true}', 'General application configuration', 'general'),
    ('sla_policies', '{"urgent": 4, "high": 24, "medium": 48, "low": 72}', 'SLA time limits in hours', 'sla'),
    ('geofence_config', '{"radius_meters": 500, "enabled": true}', 'Geofencing constraints for technician actions', 'system')
ON CONFLICT (key) DO UPDATE 
SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

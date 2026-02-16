-- Create system_config table
CREATE TABLE IF NOT EXISTS public.system_config (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Insert default configurations
INSERT INTO public.system_config (key, value, description)
VALUES 
    ('maintenance_mode', '{"enabled": false, "message": "System is under maintenance"}'::jsonb, 'System maintenance status'),
    ('sla_settings', '{"urgent_hours": 4, "normal_hours": 24, "low_hours": 48}'::jsonb, 'Service Level Agreement timeframes'),
    ('stock_alerts', '{"min_threshold_global": 5, "enable_email_alerts": true}'::jsonb, 'Inventory alert settings')
ON CONFLICT (key) DO NOTHING;

-- Log the creation
INSERT INTO public.system_logs (action_type, entity_name, details)
VALUES ('CREATE', 'SCHEMA', '{"change": "Created system_config table and defaults"}');

-- Phase 39: Global Geofencing Control

-- 1. Insert the default configuration for geofencing
INSERT INTO system_config (key, value, description, updated_at)
VALUES 
    ('geofencing_enabled', 'true', 'Enable/Disable GPS location enforcement for ticket creation and closure (200m radius)', NOW())
ON CONFLICT (key) DO NOTHING;

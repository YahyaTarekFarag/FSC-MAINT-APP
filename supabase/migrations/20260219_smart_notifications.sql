-- Create notification_templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
    key TEXT PRIMARY KEY,
    template_ar TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update UI Schema to include WhatsApp action
UPDATE public.ui_schemas
SET schema_definition = schema_definition || '{
    "list_config": {
        "actions": [
            {"id": "view", "label": "عرض", "icon": "eye", "color": "blue"},
            {"id": "whatsapp", "label": "واتساب", "icon": "message-circle", "color": "green"}
        ]
    }
}'::jsonb
WHERE form_key = 'ticket_maintenance_v1';

-- Seed initial templates
INSERT INTO public.notification_templates (key, template_ar)
VALUES 
('new_ticket', 'مرحباً {{name}}، تم فتح بلاغ جديد برقم {{ticket_id}} في فرع {{branch}}. العطل: {{issue}}.'),
('ticket_assigned', 'مرحباً {{name}}، تم إسناد المهمة رقم {{ticket_id}} لك في فرع {{branch}}. العطل: {{issue}}.'),
('ticket_rejected', 'مرحباً {{name}}، تم رفض المهمة رقم {{ticket_id}} في فرع {{branch}}. السبب: {{reason}}.')
ON CONFLICT (key) DO UPDATE 
SET template_ar = EXCLUDED.template_ar,
    updated_at = NOW();

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (or authenticated)
DROP POLICY IF EXISTS "Allow public read access for templates" ON public.notification_templates;
CREATE POLICY "Allow public read access for templates"
ON public.notification_templates
FOR SELECT
TO authenticated
USING (is_active = true);

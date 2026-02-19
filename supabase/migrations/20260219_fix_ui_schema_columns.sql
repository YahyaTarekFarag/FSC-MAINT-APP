-- Fix UI Schema for Ticket Maintenance List
UPDATE public.ui_schemas
SET schema_definition = jsonb_set(
    jsonb_set(
        schema_definition,
        '{list_config}',
        '{
            "columns": [
                { "key": "branch.name_ar", "label": "الفرع", "type": "text" },
                { "key": "fault_category", "label": "نوع العطل", "type": "text" },
                { "key": "status", "label": "الحالة", "type": "badge" },
                { "key": "created_at", "label": "التاريخ", "type": "date" }
            ],
            "actions": [
                { "id": "view", "label": "عرض", "icon": "eye", "color": "blue" },
                { "id": "whatsapp", "label": "واتساب", "icon": "message-circle", "color": "green" }
            ]
        }'::jsonb
    ),
    '{title}',
    '"سجل البلاغات السيادي"'
)
WHERE form_key = 'ticket_maintenance_v1';

-- Ensure the schema is active
UPDATE public.ui_schemas
SET is_active = true
WHERE form_key = 'ticket_maintenance_v1';

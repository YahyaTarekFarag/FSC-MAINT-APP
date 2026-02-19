-- Phase 2: The Neural Flow - Schema Evolution

UPDATE public.ui_schemas
SET schema_definition = schema_definition || '{
    "list_config": {
        "columns": [
            {"key": "id", "label": "رقم التذكرة", "type": "id"},
            {"key": "branch.name_ar", "label": "الفرع", "type": "text"},
            {"key": "issue_description", "label": "العطل", "type": "text"},
            {"key": "severity_level", "label": "الأولوية", "type": "badge", "colors": {"high": "red", "medium": "yellow", "low": "green", "urgent": "purple"}},
            {"key": "status", "label": "الحالة", "type": "status"},
            {"key": "created_at", "label": "تاريخ البلاغ", "type": "date"}
        ],
        "actions": ["view", "edit", "delete"]
    }
}'::jsonb
WHERE form_key = 'ticket_maintenance_v1';

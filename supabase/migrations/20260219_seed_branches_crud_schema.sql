-- Branch Management Schema (Sovereign V1)
INSERT INTO public.ui_schemas (form_key, schema_definition)
VALUES (
    'branches_management_v1',
    '{
        "title": "إدارة الفروع السيادية",
        "steps": [
            {
                "id": "main",
                "label": "بيانات الفرع",
                "fields": [
                    { "id": "name_ar", "label": "اسم الفرع", "type": "text", "required": true },
                    { "id": "code", "label": "كود الفرع", "type": "text", "required": true },
                    { "id": "phone", "label": "رقم الهاتف", "type": "text" },
                    { "id": "address", "label": "العنوان بالتفصيل", "type": "textarea" },
                    { "id": "area_id", "label": "المنطقة", "type": "select", "dataSource": "areas" }
                ]
            }
        ],
        "list_config": {
            "allowAdd": true,
            "columns": [
                { "key": "code", "label": "الكود", "type": "text" },
                { "key": "name_ar", "label": "اسم الفرع", "type": "text" },
                { "key": "phone", "label": "الهاتف", "type": "text" },
                { "key": "created_at", "label": "تاريخ الإضافة", "type": "date" }
            ],
            "actions": [
                { "id": "edit", "label": "تعديل", "icon": "edit", "color": "amber" },
                { "id": "delete", "label": "حذف", "icon": "trash", "color": "red" }
            ]
        }
    }'::jsonb
)
ON CONFLICT (form_key) DO UPDATE 
SET schema_definition = EXCLUDED.schema_definition;

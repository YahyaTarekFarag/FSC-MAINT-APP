-- PHASE 3 & 4: THE HANDOVER PROTOCOL & DYNAMIC QUESTIONNAIRES

-- 1. Status Upgrades
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'pending_approval';

-- 2. Quality Control Columns
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS handover_notes TEXT;

-- 3. Dynamic Reporter Schema (ticket_form_v1)
INSERT INTO public.ui_schemas (schema_key, list_config, form_config)
VALUES (
    'ticket_form_v1',
    '{
        "title": "بلاغات الأعطال",
        "columns": [
            {"id": "id", "label": "رقم البلاغ", "type": "text"},
            {"id": "created_at", "label": "التاريخ", "type": "date"},
            {"id": "branch_id", "label": "الفرع", "type": "relation", "relation": "branches", "displayField": "name_ar"},
            {"id": "fault_category", "label": "نوع العطل", "type": "text"},
            {"id": "priority", "label": "الأولوية", "type": "badge"},
            {"id": "status", "label": "الحالة", "type": "status"}
        ],
        "actions": ["view", "edit", "delete"]
    }'::jsonb,
    '{
        "title": "إبلاغ عن عطل جديد",
        "fields": [
            {
                "id": "branch_id",
                "label": "الفرع المشتكي",
                "type": "select",
                "dataSource": "branches",
                "required": true
            },
            {
                "id": "asset_id",
                "label": "المعدة المتعطلة",
                "type": "select",
                "dataSource": "maintenance_assets",
                "required": false
            },
            {
                "id": "fault_category",
                "label": "تصنيف العطل",
                "type": "select",
                "dataSource": "fault_categories",
                "required": true
            },
            {
                "id": "priority",
                "label": "درجة الأهمية",
                "type": "select",
                "options": [
                    {"label": "منخفضة", "value": "low"},
                    {"label": "متوسطة", "value": "medium"},
                    {"label": "عالية", "value": "high"},
                    {"label": "طارئة", "value": "urgent"}
                ],
                "required": true
            },
            {
                "id": "description",
                "label": "تفاصيل العطل",
                "type": "textarea",
                "placeholder": "يرجى شرح العطل بوضوح لمساعدة الفني...",
                "required": true
            },
            {
                "id": "images_url",
                "label": "صور العطل",
                "type": "photo",
                "required": false
            }
        ]
    }'::jsonb
)
ON CONFLICT (schema_key) DO UPDATE 
SET form_config = EXCLUDED.form_config,
    list_config = EXCLUDED.list_config;

-- 4. Handover Approval Metadata (handover_form_v1)
INSERT INTO public.ui_schemas (schema_key, list_config, form_config)
VALUES (
    'handover_form_v1',
    '{"title": "مراجعة الاستلام"}'::jsonb,
    '{
        "title": "مراجعة واعتماد الإصلاح",
        "fields": [
            {
                "id": "rating",
                "label": "تقييم جودة الإصلاح",
                "type": "rating",
                "required": true
            },
            {
                "id": "handover_notes",
                "label": "ملاحظات الاستلام / أسباب الرفض",
                "type": "textarea",
                "placeholder": "اكتب ملاحظاتك للفني هنا...",
                "required": false
            }
        ]
    }'::jsonb
)
ON CONFLICT (schema_key) DO UPDATE 
SET form_config = EXCLUDED.form_config;

COMMENT ON COLUMN public.tickets.rating IS 'Manager rating (1-5) for the repair quality';
COMMENT ON COLUMN public.tickets.handover_notes IS 'Feedback or rejection reason provided by the manager during handover';

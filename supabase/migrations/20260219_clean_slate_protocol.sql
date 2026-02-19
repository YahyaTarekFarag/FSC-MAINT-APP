-- Phase 1: The Clean Slate Protocol - Database Engineering

-- 1. Create ui_schemas table
CREATE TABLE IF NOT EXISTS public.ui_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_key TEXT NOT NULL UNIQUE,
    schema_definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Security (RLS Enforcement)
ALTER TABLE public.ui_schemas ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can render forms
CREATE POLICY "Enable SELECT for authenticated users" 
ON public.ui_schemas FOR SELECT 
TO authenticated 
USING (true);

-- Policy 2: Admins have full access
CREATE POLICY "Enable ALL for admins" 
ON public.ui_schemas FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- 3. Seed Data: Branch Maintenance Ticket
INSERT INTO public.ui_schemas (form_key, schema_definition)
VALUES (
    'ticket_maintenance_v1',
    '{
        "title": "بلاغ صيانة فرع",
        "description": "يرجى ملء البيانات التالية بدقة",
        "steps": [
            {
                "id": "details",
                "label": "تفاصيل البلاغ",
                "fields": [
                    {
                        "id": "asset_id",
                        "label": "الأصل المرتبط",
                        "type": "select",
                        "required": true,
                        "dataSource": "maintenance_assets",
                        "placeholder": "اختر الجهاز المتعطل..."
                    },
                    {
                        "id": "severity_level",
                        "label": "مستوى الخطورة",
                        "type": "select",
                        "required": true,
                        "options": [
                            {"label": "منخفض", "value": "low"},
                            {"label": "متوسط", "value": "medium"},
                            {"label": "عالي", "value": "high"},
                            {"label": "طارئ", "value": "urgent"}
                        ]
                    },
                    {
                        "id": "issue_description",
                        "label": "وصف المشكلة",
                        "type": "textarea",
                        "required": true,
                        "placeholder": "اشرح العطل بالتفصيل..."
                    }
                ]
            },
            {
                "id": "media",
                "label": "الوسائط",
                "fields": [
                    {
                        "id": "media_upload",
                        "label": "صور العطل",
                        "type": "file",
                        "required": false,
                        "multiple": true,
                        "accept": "image/*"
                    }
                ]
            }
        ]
    }'::jsonb
) ON CONFLICT (form_key) DO UPDATE 
SET schema_definition = EXCLUDED.schema_definition;

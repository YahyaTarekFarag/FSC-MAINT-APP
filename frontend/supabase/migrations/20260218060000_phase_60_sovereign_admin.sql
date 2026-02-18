-- Phase 60: Sovereign Admin Engine Tables

-- 1. Dynamic Form Schema
-- Stores configuration for every field in key forms
CREATE TABLE IF NOT EXISTS public.form_field_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id TEXT NOT NULL, -- e.g., 'new_ticket', 'close_ticket'
    field_key TEXT NOT NULL, -- e.g., 'asset_id', 'description', 'spare_parts'
    label_ar TEXT NOT NULL,
    label_en TEXT,
    is_visible BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    field_type TEXT NOT NULL, -- 'text', 'number', 'select', 'date', 'photo', 'textarea'
    sort_order INTEGER DEFAULT 0,
    options JSONB, -- For select fields, e.g. ["Option A", "Option B"]
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(form_id, field_key)
);

-- 2. Universal Permission Matrix
-- Granular control over feautres per role
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role TEXT NOT NULL, -- 'admin', 'manager', 'technician'
    feature_key TEXT NOT NULL, -- e.g., 'view_costs', 'delete_ticket', 'view_map'
    is_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(role, feature_key)
);

-- 3. Dynamic Statuses (Workflow)
CREATE TABLE IF NOT EXISTS public.ticket_statuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status_key TEXT UNIQUE NOT NULL, -- e.g., 'open', 'pending_parts'
    label_ar TEXT NOT NULL,
    label_en TEXT,
    color_code TEXT DEFAULT '#808080',
    sort_order INTEGER DEFAULT 0,
    is_system_default BOOLEAN DEFAULT false
);

-- 4. Workflow Transitions
CREATE TABLE IF NOT EXISTS public.workflow_transitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_status_id UUID REFERENCES public.ticket_statuses(id),
    to_status_id UUID REFERENCES public.ticket_statuses(id),
    allowed_roles JSONB DEFAULT '["admin"]'::jsonb -- ['admin', 'manager']
);

-- Enable RLS
ALTER TABLE public.form_field_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin can manage everything
CREATE POLICY "Admins full access form_configs" ON public.form_field_configs FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins full access permissions" ON public.role_permissions FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins full access statuses" ON public.ticket_statuses FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
-- Authenticated users can read configurations
CREATE POLICY "Auth read form_configs" ON public.form_field_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read statuses" ON public.ticket_statuses FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_form_field_configs_form_id ON public.form_field_configs(form_id);
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);

-- Seed Data: New Ticket Form
INSERT INTO public.form_field_configs (form_id, field_key, label_ar, field_type, sort_order, is_required) VALUES
('new_ticket', 'branch_id', 'الفرع', 'select', 10, true),
('new_ticket', 'asset_id', 'الأصل / المعدة', 'select', 20, true),
('new_ticket', 'priority', 'درجة الأهمية', 'select', 30, true),
('new_ticket', 'description', 'وصف العطل', 'textarea', 40, true),
('new_ticket', 'photos', 'صور العطل', 'file', 50, false)
ON CONFLICT (form_id, field_key) DO UPDATE SET label_ar = EXCLUDED.label_ar;

-- Seed Data: Technician Preferences permissions
INSERT INTO public.role_permissions (role, feature_key, is_enabled) VALUES
('technician', 'view_cost', false),
('manager', 'view_cost', true),
('admin', 'view_cost', true),
('technician', 'view_map', false),
('manager', 'view_map', true)
ON CONFLICT (role, feature_key) DO NOTHING;

-- Seed Data: Statuses
-- We will migrate existing statuses later, but for now we insert common ones
INSERT INTO public.ticket_statuses (status_key, label_ar, color_code, sort_order, is_system_default) VALUES
('open', 'مفتوح', '#ef4444', 10, true),
('in_progress', 'جاري العمل', '#f59e0b', 20, true),
('pending_parts', 'بانتظار قطع', '#8b5cf6', 30, false),
('resolved', 'تم الحل', '#10b981', 40, true),
('closed', 'مغلق', '#6b7280', 50, true)
ON CONFLICT (status_key) DO NOTHING;

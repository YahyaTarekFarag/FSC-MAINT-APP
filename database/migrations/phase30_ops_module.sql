-- ==========================================
-- PHASE 30: OPERATIONS & TECHNICIAN MANAGEMENT
-- ==========================================

-- 1. TECHNICIAN PRESENCE & LOCATION
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS presence_status TEXT CHECK (presence_status IN ('online', 'busy', 'offline')) DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_work_lat NUMERIC,
ADD COLUMN IF NOT EXISTS current_work_lng NUMERIC;

-- 2. FLEXIBLE ASSIGNMENTS (Many-to-Many)
-- Allows a technician to cover multiple areas, or one area to have multiple techs (Primary/Backup)
CREATE TABLE IF NOT EXISTS public.area_tech_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE NOT NULL,
    technician_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    assignment_type TEXT CHECK (assignment_type IN ('primary', 'backup')) DEFAULT 'primary',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(area_id, technician_id) -- Prevent duplicate assignment of same tech to same area
);

-- 3. CLOSURE FORM TEMPLATES
-- Stores the JSON schema for dynamic closure forms
CREATE TABLE IF NOT EXISTS public.closure_form_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    structure JSONB NOT NULL, -- The JSON Schema or Form definition
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. RLS POLICIES

-- Assignments
ALTER TABLE public.area_tech_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins Managers Manage Assignments" ON public.area_tech_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

CREATE POLICY "Technicians View Own Assignments" ON public.area_tech_assignments
    FOR SELECT USING (
        technician_id = auth.uid()
    );

-- Form Templates
ALTER TABLE public.closure_form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read Form Templates" ON public.closure_form_templates
    FOR SELECT USING (true); -- Publicly readable for techs to use

CREATE POLICY "Manage Form Templates" ON public.closure_form_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- 5. REAL-TIME
-- Enable Realtime for profiles to track status changes
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

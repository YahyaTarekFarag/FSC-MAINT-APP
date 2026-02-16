-- Check and create/update fault_categories
CREATE TABLE IF NOT EXISTS public.fault_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name_ar text NOT NULL,
    name_en text,
    icon text, -- Lucide icon name
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Check and create/update sla_policies
CREATE TABLE IF NOT EXISTS public.sla_policies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    priority_level text NOT NULL UNIQUE, -- urgent, high, medium, low
    resolution_hours integer NOT NULL DEFAULT 24,
    color_code text NOT NULL, -- e.g., #EF4444
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Seed defaults if empty
INSERT INTO public.sla_policies (priority_level, resolution_hours, color_code)
VALUES 
    ('urgent', 4, '#EF4444'),
    ('high', 12, '#F59E0B'),
    ('medium', 48, '#3B82F6'),
    ('low', 96, '#10B981')
ON CONFLICT (priority_level) DO NOTHING;

-- RLS Policies
ALTER TABLE public.fault_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all users" ON public.fault_categories FOR SELECT USING (true);
CREATE POLICY "Allow admin full access" ON public.fault_categories FOR ALL USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow read access to all users" ON public.sla_policies FOR SELECT USING (true);
CREATE POLICY "Allow admin full access" ON public.sla_policies FOR ALL USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
    id bigint generated always as identity primary key,
    user_id uuid references auth.users(id),
    action_type text not null, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'OTHER'
    entity_name text not null, -- 'TICKET', 'PART', 'USER', 'BRAND', 'UNIT'
    details jsonb,
    created_at timestamptz default now()
);

-- Enable RLS for system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Allow Admins to View All Logs
CREATE POLICY "Admins can view all logs" ON public.system_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Allow Authenticated Users to Insert Logs (via application logic)
CREATE POLICY "Authenticated users can insert logs" ON public.system_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create unit_types table
CREATE TABLE IF NOT EXISTS public.unit_types (
    id bigint generated always as identity primary key,
    name_ar text not null unique
);

-- Enable RLS for unit_types
ALTER TABLE public.unit_types ENABLE ROW LEVEL SECURITY;

-- Allow Everyone to Read Units
CREATE POLICY "Everyone can read unit types" ON public.unit_types
    FOR SELECT TO authenticated USING (true);

-- Allow Admins/Managers to Manage Units
CREATE POLICY "Admins and Managers can manage unit types" ON public.unit_types
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Insert Default Units
INSERT INTO public.unit_types (name_ar) VALUES
    ('قطعة'),
    ('متر'),
    ('كجم'),
    ('لتر'),
    ('كرتونة'),
    ('طقم')
ON CONFLICT (name_ar) DO NOTHING;

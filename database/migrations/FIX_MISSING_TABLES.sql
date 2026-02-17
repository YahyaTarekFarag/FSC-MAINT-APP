-- ==========================================
-- FIX MISSING TABLES & COLUMNS SCRIPT
-- ==========================================

-- 1. FIX PROFILES (Phase 19)
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
ADD COLUMN IF NOT EXISTS phone text;

-- Helper function for RLS
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. FIX FAULT CATEGORIES & SLA (Phase 27)
CREATE TABLE IF NOT EXISTS public.fault_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name_ar text NOT NULL,
    name_en text,
    icon text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sla_policies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    priority_level text NOT NULL UNIQUE,
    resolution_hours integer NOT NULL DEFAULT 24,
    color_code text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

INSERT INTO public.sla_policies (priority_level, resolution_hours, color_code)
VALUES 
    ('urgent', 4, '#EF4444'),
    ('high', 12, '#F59E0B'),
    ('medium', 48, '#3B82F6'),
    ('low', 96, '#10B981')
ON CONFLICT (priority_level) DO NOTHING;

ALTER TABLE public.fault_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent errors
DROP POLICY IF EXISTS "Allow read access to all users" ON public.fault_categories;
DROP POLICY IF EXISTS "Allow admin full access_fc" ON public.fault_categories;
DROP POLICY IF EXISTS "Allow read access to all users" ON public.sla_policies;
DROP POLICY IF EXISTS "Allow admin full access_sla" ON public.sla_policies;

CREATE POLICY "Allow read access to all users" ON public.fault_categories FOR SELECT USING (true);
CREATE POLICY "Allow admin full access_fc" ON public.fault_categories FOR ALL USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow read access to all users" ON public.sla_policies FOR SELECT USING (true);
CREATE POLICY "Allow admin full access_sla" ON public.sla_policies FOR ALL USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- 3. FIX INVENTORY (Spare Parts)
CREATE TABLE IF NOT EXISTS public.spare_parts (
  id bigint primary key generated always as identity,
  name_ar text not null,
  part_number text,
  description text,
  quantity int default 0,
  min_threshold int default 5,
  price decimal(10,2) default 0,
  location text,
  supplier text,
  compatible_models text,
  image_url text,
  category_id uuid references public.fault_categories(id),
  unit_id bigint references public.unit_types(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id bigint primary key generated always as identity,
  part_id bigint references public.spare_parts(id) not null,
  ticket_id uuid references public.tickets(id),
  user_id uuid references auth.users(id) not null,
  change_amount int not null,
  transaction_type text check (transaction_type in ('restock', 'consumption', 'adjustment', 'return')) not null,
  notes text,
  created_at timestamptz default now()
);

ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read access to all users_sp" ON public.spare_parts;
DROP POLICY IF EXISTS "Allow admin/manager full access_sp" ON public.spare_parts;
DROP POLICY IF EXISTS "Allow read access to all users_it" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Allow admin/manager full access_it" ON public.inventory_transactions;

CREATE POLICY "Allow read access to all users_sp" ON public.spare_parts FOR SELECT USING (true);
CREATE POLICY "Allow admin/manager full access_sp" ON public.spare_parts FOR ALL USING (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);

CREATE POLICY "Allow read access to all users_it" ON public.inventory_transactions FOR SELECT USING (true);
CREATE POLICY "Allow admin/manager full access_it" ON public.inventory_transactions FOR ALL USING (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);

-- 4. FIX UNIT TYPES (Phase 22 - Just in case)
CREATE TABLE IF NOT EXISTS public.unit_types (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name_ar text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.unit_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access_ut" ON public.unit_types;
DROP POLICY IF EXISTS "Allow admin full access_ut" ON public.unit_types;

CREATE POLICY "Allow read access_ut" ON public.unit_types FOR SELECT USING (true);
CREATE POLICY "Allow admin full access_ut" ON public.unit_types FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.unit_types (name_ar) VALUES ('قطعة'), ('لتر'), ('متر'), ('كيلو'), ('علبة') ON CONFLICT DO NOTHING;

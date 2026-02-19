-- ==========================================
-- BREAKTHROUGH PROTOCOL: RLS RECOVERY
-- ==========================================

-- 1. Branches Access
DROP POLICY IF EXISTS "Public Read Branches" ON public.branches;
CREATE POLICY "Public Read Branches" ON public.branches 
FOR SELECT TO authenticated USING (true);

-- 2. Profiles Access (Limited lookup for name/id)
DROP POLICY IF EXISTS "Authenticated Read Profiles" ON public.profiles;
CREATE POLICY "Authenticated Read Profiles" ON public.profiles 
FOR SELECT TO authenticated USING (true);

-- 3. Brands Access
DROP POLICY IF EXISTS "Public Read Brands" ON public.brands;
CREATE POLICY "Public Read Brands" ON public.brands 
FOR SELECT TO authenticated USING (true);

-- 4. Spare Parts Access
DROP POLICY IF EXISTS "Public Read Spare Parts" ON public.spare_parts;
CREATE POLICY "Public Read Spare Parts" ON public.spare_parts 
FOR SELECT TO authenticated USING (true);

-- 5. UI Schemas Access (Crucial for the Wizard)
DROP POLICY IF EXISTS "Public Read UI Schemas" ON public.ui_schemas;
CREATE POLICY "Public Read UI Schemas" ON public.ui_schemas 
FOR SELECT TO authenticated USING (true);

-- 6. Maintenance Assets Access
DROP POLICY IF EXISTS "Public Read Assets" ON public.maintenance_assets;
CREATE POLICY "Public Read Assets" ON public.maintenance_assets 
FOR SELECT TO authenticated USING (true);

-- Re-enable RLS to be sure
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_assets ENABLE ROW LEVEL SECURITY;

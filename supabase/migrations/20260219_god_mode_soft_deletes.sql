-- Universal Soft Delete & RLS Hardening
-- Phase: Universal CRUD Engine (God Mode)

-- 1. Add is_active to all Master Data Tables
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.spare_parts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.maintenance_assets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Update RLS for Branches
DROP POLICY IF EXISTS "Public Read Branches" ON public.branches;
DROP POLICY IF EXISTS "Public Read Active Branches" ON public.branches;
CREATE POLICY "Public Read Active Branches" ON public.branches 
FOR SELECT TO authenticated 
USING (is_active = true);

DROP POLICY IF EXISTS "Admin CRUD Branches" ON public.branches;
CREATE POLICY "Admin CRUD Branches" ON public.branches
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Update RLS for Profiles (Active Only)
DROP POLICY IF EXISTS "Authenticated Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated Read Active Profiles" ON public.profiles;
CREATE POLICY "Authenticated Read Active Profiles" ON public.profiles
FOR SELECT TO authenticated
USING (is_active = true);

-- 4. Update RLS for Brands (Active Only)
DROP POLICY IF EXISTS "Public Read Brands" ON public.brands;
DROP POLICY IF EXISTS "Public Read Active Brands" ON public.brands;
CREATE POLICY "Public Read Active Brands" ON public.brands
FOR SELECT TO authenticated
USING (is_active = true);

-- 5. Update RLS for spare_parts (Active Only)
DROP POLICY IF EXISTS "Public Read Active spare_parts" ON public.spare_parts;
CREATE POLICY "Public Read Active spare_parts" ON public.spare_parts
FOR SELECT TO authenticated
USING (is_active = true);

-- 6. Update RLS for Assets (Active Only)
DROP POLICY IF EXISTS "Public Read Assets" ON public.maintenance_assets;
DROP POLICY IF EXISTS "Public Read Active Assets" ON public.maintenance_assets;
CREATE POLICY "Public Read Active Assets" ON public.maintenance_assets
FOR SELECT TO authenticated
USING (is_active = true);

-- 7. Add Index for Performance
CREATE INDEX IF NOT EXISTS idx_branches_active ON public.branches(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_spare_parts_active ON public.spare_parts(is_active) WHERE is_active = true;

-- PHASE 42: ADMIN HARDENING - RLS PERMISSIONS CHECK
-- This script ensures that users with the 'admin' role have full authority.

-- 1. Enable RLS on core tables (Safe to run multiple times)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_config ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing admin policies to prevent duplicates
DO $$
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Admins have full access on profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
    
    -- Branches
    DROP POLICY IF EXISTS "Admins have full access on branches" ON public.branches;
    DROP POLICY IF EXISTS "Admin full access" ON public.branches;

    -- Spare Parts
    DROP POLICY IF EXISTS "Admins have full access on spare_parts" ON public.spare_parts;
    DROP POLICY IF EXISTS "Admin full access" ON public.spare_parts;

    -- System Config
    DROP POLICY IF EXISTS "Admins have full access on system_config" ON public.system_config;
    DROP POLICY IF EXISTS "Admin full access" ON public.system_config;
END $$;

-- 3. Create Robust Admin Policies
-- Note: We check the 'role' column in the 'profiles' table for the current user

CREATE POLICY "Admin full access on profiles" 
ON public.profiles FOR ALL 
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Admin full access on branches" 
ON public.branches FOR ALL 
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Admin full access on spare_parts" 
ON public.spare_parts FOR ALL 
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Admin full access on system_config" 
ON public.system_config FOR ALL 
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- 4. Verification View/Check (Optional)
-- To verify, you can run:
-- SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public';

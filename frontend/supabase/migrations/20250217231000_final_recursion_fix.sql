-- FINAL SECURITY FIX: RLS INFINITE RECURSION BYPASS
-- This script permanently fixes the "infinite recursion" error (42P17) 
-- by moving the role check into a secure function that bypasses the policy.

-- 1. Create the Secure Check Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- This query runs as the superuser (SECURITY DEFINER), 
  -- so it can read the 'profiles' table without triggering the recursive policy.
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean Up Broken (Recursive) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 3. Apply New Non-Recursive Policies
-- A: Users can ALWAYS see their own profile (Critical for login)
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

-- B: Admins can do EVERYTHING (Uses the secure function)
CREATE POLICY "Admins have full access on profiles" 
ON public.profiles FOR ALL 
USING ( public.is_admin() );

-- 4. Apply to Other Admin-Only Tables
DROP POLICY IF EXISTS "Admin full access on maintenance_assets" ON public.maintenance_assets;
CREATE POLICY "Admin full access on maintenance_assets" ON public.maintenance_assets FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full access on branches" ON public.branches;
CREATE POLICY "Admin full access on branches" ON public.branches FOR ALL USING (public.is_admin());

-- 5. Verify 
SELECT public.is_admin();

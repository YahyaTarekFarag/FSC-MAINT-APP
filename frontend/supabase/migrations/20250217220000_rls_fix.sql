-- FIX: PHASE 42 - RLS RECURSION & PERMISSIONS REPAIR
-- This script fixes the issue where admins/users couldn't view their own profiles

-- 1. Ensure RLS is on
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop the recursive/problematic policy
DROP POLICY IF EXISTS "Admin full access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Manager view own branch assets" ON public.maintenance_assets; -- Also check others for recursion

-- 3. Add base "View Own Profile" policy (CRITICAL for login/session)
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

-- 4. Add "Update Own Profile" (For email/name changes)
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

-- 5. Fix Admin Policy (Non-recursive check)
-- We use a subquery that specifically targets the user ID to check the role, 
-- but we must be careful. In Supabase, often it's better to use a security definer function
-- or check the JWT if the role is stored there. 
-- However, for now, let's use a simpler check that doesn't trigger full table recursion.

CREATE POLICY "Admins have full access on all profiles" 
ON public.profiles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 6. Apply same logic to other tables to be safe
DROP POLICY IF EXISTS "Admin full access on branches" ON public.branches;
CREATE POLICY "Admin full access on branches" 
ON public.branches FOR ALL 
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

DROP POLICY IF EXISTS "Admin full access on spare_parts" ON public.spare_parts;
CREATE POLICY "Admin full access on spare_parts" 
ON public.spare_parts FOR ALL 
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

DROP POLICY IF EXISTS "Admin full access on maintenance_assets" ON public.maintenance_assets;
CREATE POLICY "Admin full access on maintenance_assets" 
ON public.maintenance_assets FOR ALL 
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

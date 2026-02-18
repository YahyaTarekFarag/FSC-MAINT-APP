-- FINAL FIX: RLS INFINITE RECURSION (SECURITY DEFINER APPROACH)
-- The error "infinite recursion detected" (42P17) happens because the policy queries the same table it protects.
-- We fix this by moving the admin check into a "Security Definer" function that bypasses RLS.

-- 1. Create a secure function to check admin status
-- "SECURITY DEFINER" means this function runs with the permissions of the creator (superuser),
-- allowing it to read 'profiles' without triggering RLS policies.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix 'profiles' table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Policy A: Users can see themselves (No recursion, direct ID check)
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

-- Policy B: Admins can do everything (Uses the function to break recursion)
CREATE POLICY "Admins have full access on profiles" 
ON public.profiles FOR ALL 
USING ( public.is_admin() );

-- 3. Fix other tables that might rely on admin checks (Just to be safe)
-- Maintenance Assets
DROP POLICY IF EXISTS "Admin full access on maintenance_assets" ON public.maintenance_assets;
CREATE POLICY "Admin full access on maintenance_assets" 
ON public.maintenance_assets FOR ALL 
USING ( public.is_admin() );

-- Branches
DROP POLICY IF EXISTS "Admin full access on branches" ON public.branches;
CREATE POLICY "Admin full access on branches" 
ON public.branches FOR ALL 
USING ( public.is_admin() );

-- verify
SELECT public.is_admin();

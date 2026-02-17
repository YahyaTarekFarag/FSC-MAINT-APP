
-- ========================================================
-- FIX V2: Infinite Recursion in Profiles RLS (Technician Policy)
-- ========================================================
-- Problem: The "Technicians View Area Profiles" policy uses a subquery on the profiles table,
-- which also triggers infinite recursion, even for Admins (as all policies are evaluated).

-- Solution: Use a SECURITY DEFINER function to fetch the area_id, bypassing RLS.

-- 1. Create a secure function to get the current user's assigned area
CREATE OR REPLACE FUNCTION public.get_my_area_id()
RETURNS UUID AS $$
  SELECT assigned_area_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Drop the recursive technician policy
DROP POLICY IF EXISTS "Technicians View Area Profiles" ON public.profiles;

-- 3. Re-create the policy using the safe function
CREATE POLICY "Technicians View Area Profiles" ON public.profiles
FOR SELECT USING (
    public.get_my_area_id() IS NOT NULL AND
    public.get_my_area_id() = assigned_area_id
);

-- Note: We check IS NOT NULL to ensure we don't accidentally match NULLs if that logic existed, 
-- though standard SQL equality failing on NULL usually handles it.

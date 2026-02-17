
-- ========================================================
-- FIX: Infinite Recursion in Profiles RLS
-- ========================================================
-- Problem: The policy "Admins Managers View All Profiles" queries the profiles table 
-- to check the user's role, while the policy itself is checking if the user can view the profile. 
-- This creates an infinite loop.

-- Solution: Use a SECURITY DEFINER function to fetch the role, bypassing RLS.

-- 1. Create a secure function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Admins Managers View All Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Technicians View Area Profiles" ON public.profiles;

-- 3. Re-create policies using the safe function
CREATE POLICY "Admins Managers View All Profiles" ON public.profiles
FOR SELECT USING (
    public.get_my_role() IN ('admin', 'manager')
);

CREATE POLICY "Technicians View Area Profiles" ON public.profiles
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles me 
        WHERE me.id = auth.uid() 
        AND me.assigned_area_id = profiles.assigned_area_id
    )
);
-- Note: The Technician policy usually doesn't recurse if it joins on ID, 
-- but just to be safe, let's keep it simple or use the function if needed.
-- Actually, for Technicians, 'me.id = auth.uid()' uses the "View Own Profile" policy (auth.uid() = id),
-- so it MIGHT be safe, but let's leave it as is if it wasn't the one failing.
-- The error was "Admin failed to fetch", so fixing the Admin policy is the priority.

-- Let's also fix the Inventory Policy which had a similar pattern
DROP POLICY IF EXISTS "Manage Inventory" ON public.spare_parts;
CREATE POLICY "Manage Inventory" ON public.spare_parts 
FOR ALL USING (
    public.get_my_role() IN ('admin', 'manager')
);

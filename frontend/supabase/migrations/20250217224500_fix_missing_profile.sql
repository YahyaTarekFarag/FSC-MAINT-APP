-- COMPLETE REPAIR: MISSING PROFILE & PERMISSIONS
-- This script fixes the "No Profile" error by ensuring the profile row exists and permissions are correct.

-- 1. Ensure the profile row exists for user '123'
INSERT INTO public.profiles (id, full_name, role, email, status)
SELECT 
    id, 
    'Admin User', 
    'admin', 
    email, 
    'active'
FROM auth.users 
WHERE email = '123@system.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', status = 'active';

-- 2. RE-APPLY CRITICAL RLS POLICIES (Just to be absolutely sure)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop potentially broken policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access on profiles" ON public.profiles;

-- Allow users to see their own profile (THE MOST IMPORTANT ONE)
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

-- Allow admins to do everything
CREATE POLICY "Admins have full access on profiles" 
ON public.profiles FOR ALL 
USING ( 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' 
);

-- 3. Verify the result
SELECT * FROM public.profiles 
WHERE email = '123@system.com';

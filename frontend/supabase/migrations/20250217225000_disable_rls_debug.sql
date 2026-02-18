-- NUCLEAR OPTION: DISABLE RLS TEMPORARILY
-- Use this ONLY to confirm if RLS is the blocker.

-- 1. Disable RLS on profiles to see if the row appears
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Verify existence of the user profile
SELECT * FROM public.profiles WHERE email = '123@system.com';

-- 3. (Optional) Force Admin again while we are at it
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE email = '123@system.com';

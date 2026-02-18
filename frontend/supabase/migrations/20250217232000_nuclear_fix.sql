-- NUCLEAR REPAIR: DROP ALL POLICIES ON PROFILES
-- This script dynamically finds and removes EVERY policy on the 'profiles' table 
-- to ensure no hidden recursive policies remain.

-- 1. Dynamic Drop of ALL Policies on 'profiles'
DO $$
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- 2.  Re-create Security Definer Function (Best Practice: Set search_path)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- 3. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Add Fresh, Clean Policies

-- A. VIEW OWN PROFILE (The most critical one)
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

-- B. UPDATE OWN PROFILE
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id );

-- C. ADMIN FULL ACCESS (Bypass Recursion)
CREATE POLICY "Admins have full access on profiles" 
ON public.profiles FOR ALL 
USING ( public.is_admin() );

-- 5. Verification: Try to read the specific user to prove it works
SELECT * FROM public.profiles WHERE email = '123@system.com';

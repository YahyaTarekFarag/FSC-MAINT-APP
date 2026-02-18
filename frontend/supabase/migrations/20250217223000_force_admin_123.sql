-- FORCE ADMIN ROLE UPDATE
-- This script explicitly upgrades the user '123' (email: 123@system.com) to admin.

-- 1. Update the profile role
UPDATE public.profiles
SET role = 'admin',
    full_name = 'Admin User' -- Optional: set a friendly name
WHERE id IN (
    SELECT id FROM auth.users WHERE email = '123@system.com'
);

-- 2. Verify the update
SELECT email, role, id FROM public.profiles 
JOIN auth.users ON profiles.id = users.id
WHERE email = '123@system.com';

-- 3. Ensure RLS allows this user to see themselves (Redundant but safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" 
        ON public.profiles FOR SELECT 
        USING ( auth.uid() = id );
    END IF;
END $$;

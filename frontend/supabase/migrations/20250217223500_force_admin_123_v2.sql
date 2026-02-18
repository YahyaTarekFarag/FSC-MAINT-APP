-- FORCE ADMIN UPDGRADE FOR USER '123' (CORRECTED)
-- This script explicitly upgrades the user '123' (email: 123@system.com) to admin.

-- 1. Update the profile role
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = '123@system.com'
);

-- 2. Verify the update (Fixed ambiguous column error)
SELECT 
    users.email, 
    profiles.role, 
    profiles.id 
FROM public.profiles 
JOIN auth.users ON profiles.id = users.id
WHERE users.email = '123@system.com';

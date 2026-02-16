-- Phase 19: User Management Schema Updates

-- 1. Add new columns to profiles if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- 2. Update existing 'banned' status to 'suspended' if any
UPDATE profiles SET status = 'suspended' WHERE status = 'banned';

-- 3. RLS Policies to Deny Suspended Users

-- Helper function to check if current user is active
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS on relevant tables (Example: tickets)
-- Note: You might need to drop existing policies first if they conflict, 
-- or append this check to existing policies.
-- Here is an example of a policy that allows access ONLY if user is active.

-- POLICY: Active users can view tickets (This is illustrative, your actual policy might differ)
-- CREATE POLICY "Active users can view tickets" ON tickets
-- FOR SELECT USING (auth.uid() = assigned_technician_id AND is_user_active());

-- CRITICAL: Ensure the Admin can always manage users regardless of their own status (though admin status usually shouldn't change).

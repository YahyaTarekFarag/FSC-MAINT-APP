-- Add Location Tracking Columns to Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_lat double precision,
ADD COLUMN IF NOT EXISTS last_lng double precision,
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Create Index for efficient location querying
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen_at);

-- Relax RLS on Tickets to allow Admins/Managers to re-assign
DROP POLICY IF EXISTS "Enable update for admins and managers" ON public.tickets;

CREATE POLICY "Enable update for admins and managers"
ON public.tickets FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'role') IN ('admin', 'manager') OR
  (technician_id = auth.uid()) -- Techs can still update their own tickets
)
WITH CHECK (
  (auth.jwt() ->> 'role') IN ('admin', 'manager') OR
  (technician_id = auth.uid())
);

-- Note: The `assign_ticket` logic might be better handled via a specific RPC or policy that allows
-- updating ONLY the `technician_id` column if the user is an admin/manager.
-- But for now, general update access for these roles is acceptable given the requirements.

-- Add RLS for Profiles Location Updates
-- Technicians should be able to update their OWN location
CREATE POLICY "Technicians can update their own location"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins should be able to VIEW all locations (Already covered by "Enable read access for authenticated users")

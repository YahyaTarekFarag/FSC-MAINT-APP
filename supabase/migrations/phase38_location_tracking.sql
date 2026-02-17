-- Phase 38: Comprehensive Location & Time Tracking

-- 1. Add columns for Reporter's Location (where the ticket was created)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS location_lat double precision,
ADD COLUMN IF NOT EXISTS location_lng double precision;

-- 2. Add column for when the technician actually started working
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- 3. Add comment to clarify column usage
COMMENT ON COLUMN tickets.location_lat IS 'Latitude where the ticket was created (Reporter Position)';
COMMENT ON COLUMN tickets.location_lng IS 'Longitude where the ticket was created (Reporter Position)';
COMMENT ON COLUMN tickets.start_work_lat IS 'Latitude where the technician started working';
COMMENT ON COLUMN tickets.end_work_lat IS 'Latitude where the technician finished working';

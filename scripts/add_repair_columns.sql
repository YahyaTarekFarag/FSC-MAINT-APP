-- Add missing columns for repair reports import
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS repair_cost NUMERIC DEFAULT 0;

-- Optional: Add dedicated columns for repair details if they don't exist
-- We will store detailed steps in form_data for now, but keeping this for reference
-- ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS repair_notes TEXT;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets';

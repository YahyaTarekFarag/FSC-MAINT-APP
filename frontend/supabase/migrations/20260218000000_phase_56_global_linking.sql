-- Phase 56: Global Linking & Data Integrity
-- 1. Create v_branch_performance view
CREATE OR REPLACE VIEW public.v_branch_performance AS
SELECT
    b.id as branch_id,
    b.name_ar as branch_name,
    COUNT(t.id) as total_tickets,
    COALESCE(SUM(t.repair_cost), 0) as total_maintenance_cost,
    COALESCE(AVG(t.repair_duration), 0) as avg_downtime
FROM
    public.branches b
LEFT JOIN
    public.tickets t ON b.id = t.branch_id
GROUP BY
    b.id, b.name_ar;

-- 2. Ensure tickets -> assets Foreign Key exists
-- We first check if it exists (dynamically) or just try to add it.
-- Using DO block to avoid error if it already exists, or just standard ALTER TABLE.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tickets_asset_id_fkey'
    ) THEN
        ALTER TABLE public.tickets
        ADD CONSTRAINT tickets_asset_id_fkey
        FOREIGN KEY (asset_id)
        REFERENCES public.assets(id);
    END IF;
END $$;

-- 3. (Optional) Enforce asset_id for CLOSED tickets (Digital Thread Validation)
-- This ensures that a ticket cannot be marked 'closed' without an asset_id.
-- Warning: This might fail if there are existing closed tickets with NULL asset_id.
-- We will add it as NOT VALID first to avoid locking/failing on existing data, then VALIDATE later if needed.
ALTER TABLE public.tickets
ADD CONSTRAINT tickets_closed_require_asset
CHECK (status != 'closed' OR asset_id IS NOT NULL)
NOT VALID;

-- Grant permissions on the view
GRANT SELECT ON public.v_branch_performance TO authenticated;
GRANT SELECT ON public.v_branch_performance TO service_role;

-- Phase 10: Predictive Inventory & Stock Intelligence (ROBUST SCHEMA SYNC)
-- Bridges PM Schedules with Inventory to forecast demand and identify stock gaps

BEGIN;

-- 1. Ensure Standard Columns Exist
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS part_name TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- 2. Data Migration: Sync legacy columns (name, stock) to standard columns if they exist
DO $$ 
BEGIN 
    -- Sync name -> part_name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='name') THEN
        UPDATE public.inventory SET part_name = name WHERE part_name IS NULL;
    END IF;
    
    -- Sync stock -> quantity
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='stock') THEN
        UPDATE public.inventory SET quantity = stock WHERE quantity IS NULL;
    END IF;
END $$;

-- 3. Create schedule_parts Bridge Table
CREATE TABLE IF NOT EXISTS public.schedule_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.maintenance_schedules(id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    required_quantity INTEGER NOT NULL CHECK (required_quantity > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(schedule_id, part_id)
);

-- 4. Enable RLS
ALTER TABLE public.schedule_parts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Schedule parts are viewable by all authenticated users" ON public.schedule_parts;
CREATE POLICY "Schedule parts are viewable by all authenticated users"
    ON public.schedule_parts FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage schedule parts" ON public.schedule_parts;
CREATE POLICY "Admins can manage schedule parts"
    ON public.schedule_parts FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Create Inventory Risk Index View
CREATE OR REPLACE VIEW public.v_inventory_risk_index AS
WITH ProjectedDemand AS (
    SELECT 
        sp.part_id,
        SUM(
            CASE 
                WHEN s.frequency = 'daily' THEN sp.required_quantity * 30
                WHEN s.frequency = 'weekly' THEN sp.required_quantity * 4
                WHEN s.frequency = 'monthly' THEN sp.required_quantity * 1
                WHEN s.frequency = 'quarterly' THEN sp.required_quantity * 0.33
                WHEN s.frequency = 'yearly' THEN sp.required_quantity * 0.08
                ELSE sp.required_quantity
            END
        ) as monthly_projected_demand
    FROM public.schedule_parts sp
    JOIN public.maintenance_schedules s ON sp.schedule_id = s.id
    WHERE s.is_active = true
    GROUP BY sp.part_id
)
SELECT 
    i.id as part_id,
    i.part_name,
    COALESCE(i.sku, 'N/A') as sku,
    i.quantity as current_stock,
    COALESCE(pd.monthly_projected_demand, 0) as projected_30d_demand,
    i.quantity - COALESCE(pd.monthly_projected_demand, 0) as projected_surplus,
    CASE 
        WHEN (i.quantity - COALESCE(pd.monthly_projected_demand, 0)) < 0 THEN 'critical'
        WHEN i.quantity < (COALESCE(pd.monthly_projected_demand, 0) * 1.5) THEN 'warning'
        ELSE 'healthy'
    END as stock_status,
    CASE 
        WHEN COALESCE(pd.monthly_projected_demand, 0) > 0 
        THEN ROUND((i.quantity::numeric / (COALESCE(pd.monthly_projected_demand, 0)::numeric / 30.0)), 1)
        ELSE 999.0
    END as days_of_coverage
FROM public.inventory i
LEFT JOIN ProjectedDemand pd ON i.id = pd.part_id;

COMMIT;

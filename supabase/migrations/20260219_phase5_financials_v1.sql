-- Migration: 20260219_phase5_financials_v1.sql
-- Goal: Atomic Inventory Control, Maintenance Expenses, and Payroll Metrics View

BEGIN;

-- 1. Create Inventory Table (The Vault)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Parts Consumption Table (Audit Log)
CREATE TABLE IF NOT EXISTS public.parts_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id),
    part_id UUID NOT NULL REFERENCES public.inventory(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    consumed_at TIMESTAMPTZ DEFAULT now(),
    consumed_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- 3. Create Maintenance Expenses Table (Petty Cash)
CREATE TABLE IF NOT EXISTS public.maintenance_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- 4. Enable Row-Level Security
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_expenses ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Inventory: Selectable by all authenticated users, but no direct quantity updates
CREATE POLICY "Inventory is viewable by all authenticated users"
    ON public.inventory FOR SELECT
    TO authenticated
    USING (true);

-- No direct UPDATE or INSERT via standard API to prevent quantity tampering
-- The quantity mutation must ONLY happen via the consume_spare_part RPC (Security Definer)

-- Parts Consumption: Viewable by anyone, creatable by anyone (but logic is in RPC)
CREATE POLICY "Parts consumption is viewable by all authenticated users"
    ON public.parts_consumption FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Technicians can insert parts consumption records"
    ON public.parts_consumption FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = consumed_by);

-- Maintenance Expenses: Viewable by anyone, creatable by anyone
CREATE POLICY "Maintenance expenses are viewable by all authenticated users"
    ON public.maintenance_expenses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Technicians can insert maintenance expense records"
    ON public.maintenance_expenses FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- 6. Atomic Inventory RPC (Security Definer)
CREATE OR REPLACE FUNCTION public.consume_spare_part(
    p_ticket_id UUID,
    p_part_id UUID,
    p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Essential: Bypasses RLS to allow quantity updates by verified logic
AS $$
DECLARE
    v_available_qty INTEGER;
    v_part_name TEXT;
    v_consumed_by UUID := auth.uid();
BEGIN
    -- 1. Atomic Row Lock: Prevent parallel race conditions
    SELECT quantity, part_name
    INTO v_available_qty, v_part_name
    FROM public.inventory
    WHERE id = p_part_id
    FOR UPDATE; -- Strictly enforce row-level locking

    -- 2. Availability Check
    IF v_available_qty < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for part: %. Available: %, Requested: %', 
            v_part_name, v_available_qty, p_quantity;
    END IF;

    -- 3. Deduct Inventory
    UPDATE public.inventory
    SET quantity = quantity - p_quantity,
        updated_at = now()
    WHERE id = p_part_id;

    -- 4. Log Consumption
    INSERT INTO public.parts_consumption (
        ticket_id,
        part_id,
        quantity,
        consumed_by
    ) VALUES (
        p_ticket_id,
        p_part_id,
        p_quantity,
        v_consumed_by
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Part consumed successfully',
        'remaining_qty', v_available_qty - p_quantity
    );
END;
$$;

-- 7. The All-Seeing Payroll View
CREATE OR REPLACE VIEW public.view_technician_monthly_closure AS
WITH MonthlyTickets AS (
    SELECT 
        technician_id,
        DATE_TRUNC('month', closed_at) AS closure_month,
        COUNT(*) AS total_tickets_closed,
        AVG(rating) AS average_rating
    FROM public.tickets
    WHERE status = 'closed'
    GROUP BY technician_id, DATE_TRUNC('month', closed_at)
),
MonthlyParts AS (
    SELECT 
        pc.consumed_by AS technician_id,
        DATE_TRUNC('month', pc.consumed_at) AS closure_month,
        SUM(pc.quantity * i.price) AS total_parts_cost
    FROM public.parts_consumption pc
    JOIN public.inventory i ON pc.part_id = i.id
    GROUP BY pc.consumed_by, DATE_TRUNC('month', pc.consumed_at)
),
MonthlyExpenses AS (
    SELECT 
        me.created_by AS technician_id,
        DATE_TRUNC('month', me.created_at) AS closure_month,
        SUM(me.amount) AS total_expenses
    FROM public.maintenance_expenses me
    GROUP BY me.created_by, DATE_TRUNC('month', me.created_at)
)
SELECT 
    t.id AS technician_id,
    p.full_name,
    mt.closure_month,
    COALESCE(mt.total_tickets_closed, 0) AS total_tickets_closed,
    ROUND(COALESCE(mt.average_rating, 0)::numeric, 2) AS average_rating,
    COALESCE(mp.total_parts_cost, 0) AS total_parts_cost,
    COALESCE(me.total_expenses, 0) AS total_expenses
FROM public.profiles t
LEFT JOIN public.profiles p ON t.id = p.id
LEFT JOIN MonthlyTickets mt ON t.id = mt.technician_id
LEFT JOIN MonthlyParts mp ON t.id = mp.technician_id AND mt.closure_month = mp.closure_month
LEFT JOIN MonthlyExpenses me ON t.id = me.technician_id AND mt.closure_month = me.closure_month
WHERE t.role = 'technician'
AND mt.closure_month IS NOT NULL; -- Ensure we only show months where activity happened

COMMIT;

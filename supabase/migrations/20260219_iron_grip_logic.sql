-- Phase 3: The Iron Grip (Logic Enforcement) - Robust Recovery

-- 1. Ensure system_config exists
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Ensure inventory exists
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    stock INTEGER DEFAULT 0,
    category TEXT,
    price DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure branches has location data (required for Geofencing)
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 4. Inventory Transactions Table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory(id),
    quantity INTEGER NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('in', 'out')),
    ticket_id UUID REFERENCES public.tickets(id),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was created by legacy migrations
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.inventory(id);
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.tickets(id);
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS change_amount INTEGER DEFAULT 0;

-- 5. Atomic Inventory Consumption RPC
CREATE OR REPLACE FUNCTION public.consume_spare_part(
    p_part_id UUID,
    p_quantity INTEGER,
    p_ticket_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS for atomic stock update
AS $$
DECLARE
    v_current_stock INTEGER;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();

    -- 1. Check current stock
    SELECT stock INTO v_current_stock
    FROM public.inventory
    WHERE id = p_part_id
    FOR UPDATE; -- Lock the row for transaction safety

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Item not found in inventory';
    END IF;

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Stock Insufficient: Available %, Requested %', v_current_stock, p_quantity;
    END IF;

    -- 2. Update Inventory
    UPDATE public.inventory
    SET stock = stock - p_quantity,
        updated_at = NOW()
    WHERE id = p_part_id;

    -- 3. Log Transaction
    INSERT INTO public.inventory_transactions (
        item_id,
        quantity,
        transaction_type,
        ticket_id,
        user_id
    ) VALUES (
        p_part_id,
        p_quantity,
        'out',
        p_ticket_id,
        v_user_id
    );

    RETURN TRUE;
END;
$$;

-- 6. Seed Data
INSERT INTO public.system_config (key, value)
VALUES ('geofence_settings', '{"radius_meters": 200, "enabled": true}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.inventory (name, description, stock, category)
VALUES 
    ('Compressor 2HP', 'Deep Fridge Compressor', 15, 'Spare Parts'),
    ('Fan Motor', 'Universal AC Fan Motor', 25, 'Spare Parts'),
    ('Capacitor 45uF', 'Running Capacitor', 50, 'Electrical'),
    ('R410A Gas', 'Refrigerant Gas (kg)', 100, 'Consumables')
ON CONFLICT DO NOTHING;

-- 7. RLS Enforcement
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read system_config" ON public.system_config;
CREATE POLICY "Allow read system_config" ON public.system_config FOR SELECT TO authenticated USING (true);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read inventory" ON public.inventory;
CREATE POLICY "Allow read inventory" ON public.inventory FOR SELECT TO authenticated USING (true);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read inventory_transactions" ON public.inventory_transactions;
CREATE POLICY "Allow read inventory_transactions" ON public.inventory_transactions FOR SELECT TO authenticated USING (true);

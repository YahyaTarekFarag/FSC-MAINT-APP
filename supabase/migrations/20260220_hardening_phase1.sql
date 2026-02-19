-- ==========================================
-- PHASE 1: [CRITICAL] DATABASE & SECURITY HARDENING
-- ==========================================

-- 1. HARDEN: consume_spare_part (Atomic Inventory)
CREATE OR REPLACE FUNCTION public.consume_spare_part(
    p_part_id UUID,
    p_quantity INTEGER,
    p_ticket_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock INTEGER;
    v_user_id UUID;
BEGIN
    -- [AUDIT] Mandatory Auth Context Validation
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Missing Authentication Context (GOD MODE V9 Protection)';
    END IF;

    -- [PERF] Prevent indefinite locking / deadlocks
    SET LOCAL lock_timeout = '3s';

    -- 1. Check current stock with Row-Level Lock
    BEGIN
        SELECT stock INTO v_current_stock
        FROM public.inventory
        WHERE id = p_part_id
        FOR UPDATE;
    EXCEPTION 
        WHEN lock_not_available OR deadlock_detected THEN
            RAISE EXCEPTION 'RESOURCE_BUSY: Item is currently locked by another transaction. Please retry in seconds.';
    END;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Sovereign Error: Item not found in inventory';
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

-- 2. HARDEN: Audit Vault Triggers (Null-Auth Protection)
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by UUID;
BEGIN
    v_changed_by := auth.uid();
    
    -- [SECURITY] Prevent anonymous/unauthorized mutations from being logged without identity
    IF v_changed_by IS NULL THEN
        RAISE EXCEPTION 'Audit Violation: No user context found for % operation on %', TG_OP, TG_TABLE_NAME;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', row_to_json(OLD)::jsonb, v_changed_by);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, v_changed_by);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', row_to_json(NEW)::jsonb, v_changed_by);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. LOCKDOWN: Profiles RLS (Hierarchical Protection)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated Read Profiles" ON public.profiles;

-- Administrator: Global View
CREATE POLICY "Admins: Global Profile Visibility"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Manager: Branch View
CREATE POLICY "Managers: Branch Profile Visibility"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.role = 'manager'
            AND p.assigned_sector_id IS NOT DISTINCT FROM profiles.assigned_sector_id
        )
    );

-- Technician: Self only (+ lookup for assignment validation)
CREATE POLICY "Users: Self and Basic Lookup"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
    );

-- ==========================================
-- [VERIFICATION]
-- 1. Try updating as tech -> should log with tech ID.
-- 2. Try closing inventory with two simultaneous calls -> one should hit RESOURCE_BUSY.
-- ==========================================

-- =========================================================================
-- Batch 1: Database & RLS Hardening (GOD MODE V9)
-- =========================================================================

-- 1. Immutable Vault Bypass (RLS)
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
-- Create a new policy that explicitly blocks direct inserts from the frontend/API.
-- Only the SECURITY DEFINER trigger can bypass this.
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2. State Machine Bypass (Tickets)
-- Add an explicit trigger to prevent invalid state jumps (e.g. open directly to pending_approval)
CREATE OR REPLACE FUNCTION public.enforce_ticket_state_machine()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check on updates to status
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    -- Valid transitions typically enforce passing through 'in_progress'
    -- If moving from open to pending_approval directly, block it.
    IF NEW.status = 'pending_approval' AND OLD.status = 'open' THEN
        RAISE EXCEPTION 'STATE_MACHINE_VIOLATION: Cannot move directly from open to pending_approval. Ticket must be placed in progress first.';
    END IF;

    -- If moving from closed to open without admin approval, block it (optional extra lock)
    IF NEW.status = 'open' AND OLD.status = 'closed' THEN
        RAISE EXCEPTION 'STATE_MACHINE_VIOLATION: Closed tickets cannot be reopened directly.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ticket_state_machine_trigger ON public.tickets;
CREATE TRIGGER ticket_state_machine_trigger
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_state_machine();

-- 3. Missing Indexes
-- Explicit indexes to eliminate sequential scans during high ops
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ticket_id ON public.inventory_transactions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_user_id ON public.inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_asset_id ON public.tickets(asset_id);

-- 4. Race Condition Deadlocks (consume_spare_part)
-- Updated RPC with NOWAIT and signature matching frontend invocation
CREATE OR REPLACE FUNCTION public.consume_spare_part(
    p_part_id UUID,
    p_quantity INTEGER,
    p_ticket_id UUID,
    p_technician_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock INTEGER;
    v_user_id UUID;
BEGIN
    -- Get current user (prefer auth.uid for security, fallback to provided if needed)
    v_user_id := COALESCE(auth.uid(), p_technician_id);

    -- 1. Check current stock with NOWAIT to prevent deadlocks
    BEGIN
        SELECT stock INTO v_current_stock
        FROM public.inventory
        WHERE id = p_part_id
        FOR UPDATE NOWAIT;
    EXCEPTION WHEN lock_not_available THEN
        RAISE EXCEPTION 'RESOURCE_BUSY: Item % is currently locked by another transaction. Please try again in a few seconds.', p_part_id;
    END;

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

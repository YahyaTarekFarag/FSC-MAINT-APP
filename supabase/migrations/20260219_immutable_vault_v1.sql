-- ==========================================
-- PHASE 6: THE IMMUTABLE VAULT (GOD MODE V8)
-- ==========================================

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Audit Log Policy: Strictly SELECT-ONLY for Admins
-- No INSERT/UPDATE/DELETE policies means the API cannot mutate this table.
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 3. Generic Audit Trigger Function (SECURITY DEFINER)
-- We use SECURITY DEFINER so that logs are written even if the user doesn't have INSERT permission.
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by UUID;
BEGIN
    -- Capture the user from the current session
    v_changed_by := auth.uid();

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

-- 4. Attach Audit Triggers
DROP TRIGGER IF EXISTS tr_audit_tickets ON public.tickets;
CREATE TRIGGER tr_audit_tickets
    AFTER INSERT OR UPDATE OR DELETE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS tr_audit_inventory ON public.inventory;
CREATE TRIGGER tr_audit_inventory
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();


-- 5. THE IRON GATE: Prevent Technicians from closing tickets
CREATE OR REPLACE FUNCTION public.protect_ticket_status()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Fetch role from profiles (Safe source of truth)
    SELECT role INTO v_user_role 
    FROM public.profiles 
    WHERE id = auth.uid();

    -- Check for security violation
    IF (v_user_role = 'technician' AND NEW.status = 'closed') THEN
        RAISE EXCEPTION 'SECURITY VIOLATION: Technicians cannot bypass the Handover Protocol. Only Managers/Admins can seal a ticket.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach status protection trigger
DROP TRIGGER IF EXISTS tr_protect_status ON public.tickets;
CREATE TRIGGER tr_protect_status
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.protect_ticket_status();

-- ==========================================
-- VERIFICATION SNIPPETS (Run in SQL Editor)
-- ==========================================
/*
-- Get a real technician ID and ticket ID first!
-- SET ROLE authenticated;
-- SET request.jwt.claims = '{"sub": "REAL_TECH_UUID", "role": "authenticated"}';
-- UPDATE tickets SET status = 'closed' WHERE id = 'REAL_TICKET_UUID'; -- Should fail with RLS Exception
*/

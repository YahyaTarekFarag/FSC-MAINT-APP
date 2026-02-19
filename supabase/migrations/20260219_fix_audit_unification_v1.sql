-- ==========================================
-- REPAIR: SOVEREIGN AUDIT UNIFICATION (v3)
-- ==========================================

BEGIN;

-- 1. HARMONIZE TABLE SCHEMA (Rename columns if they exist from legacy Phase 1)
DO $$ 
BEGIN
    -- Rename user_id to changed_by if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_id') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN user_id TO changed_by;
    END IF;

    -- Rename action_type to action if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'action_type') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN action_type TO action;
    END IF;

    -- Rename created_at to changed_at if it exists (Phase 6 uses changed_at)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'created_at') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN created_at TO changed_at;
    END IF;

    -- Ensure record_id is TEXT (To support varied primary keys)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'record_id' AND data_type = 'uuid') THEN
        ALTER TABLE public.audit_logs ALTER COLUMN record_id TYPE TEXT USING record_id::text;
    END IF;
END $$;

-- 2. Ensure the log_audit_event function is up-to-date
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by UUID;
BEGIN
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

-- 3. Drop EVERY POSSIBLE variant of the audit triggers
DROP TRIGGER IF EXISTS audit_branches_trigger ON public.branches;
DROP TRIGGER IF EXISTS audit_spare_parts_trigger ON public.spare_parts;
DROP TRIGGER IF EXISTS audit_assets_trigger ON public.maintenance_assets;
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
DROP TRIGGER IF EXISTS audit_brands_trigger ON public.brands;
DROP TRIGGER IF EXISTS audit_inventory_trigger ON public.inventory;
DROP TRIGGER IF EXISTS audit_tickets_trigger ON public.tickets;

DROP TRIGGER IF EXISTS tr_audit_tickets ON public.tickets;
DROP TRIGGER IF EXISTS tr_audit_inventory ON public.inventory;
DROP TRIGGER IF EXISTS tr_audit_branches ON public.branches;
DROP TRIGGER IF EXISTS tr_audit_spare_parts ON public.spare_parts;
DROP TRIGGER IF EXISTS tr_audit_assets ON public.maintenance_assets;
DROP TRIGGER IF EXISTS tr_audit_profiles ON public.profiles;
DROP TRIGGER IF EXISTS tr_audit_brands ON public.brands;

-- 4. Cleanup legacy function
DROP FUNCTION IF EXISTS public.process_audit_log();

-- 5. Re-attach Unified Triggers
CREATE TRIGGER tr_audit_branches AFTER INSERT OR UPDATE OR DELETE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER tr_audit_spare_parts AFTER INSERT OR UPDATE OR DELETE ON public.spare_parts FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER tr_audit_assets AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_assets FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER tr_audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER tr_audit_brands AFTER INSERT OR UPDATE OR DELETE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER tr_audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER tr_audit_tickets AFTER INSERT OR UPDATE OR DELETE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

COMMIT;

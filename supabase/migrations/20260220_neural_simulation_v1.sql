-- SOVEREIGN NEURAL SIMULATION: HISTORICAL DATA BACKFILL (v3 - Self-Healing Schema)
-- Purpose: Fuel the MTBF and Predictive Intelligence Engine
-- Targets: 197 Branches, ~500 Assets, ~2000 Historical Tickets

BEGIN;

-- 0. SELF-HEALING: Ensure missing Phase 7 columns exist
ALTER TABLE public.maintenance_assets ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS maintenance_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS monthly_budget DECIMAL(12,2) DEFAULT 0;

-- 1. CLEANUP
TRUNCATE public.maintenance_assets CASCADE;
TRUNCATE public.tickets CASCADE;

-- 2. SEED ASSETS (2-3 per branch)
DO $$
DECLARE
    branch_record RECORD;
    brand_id_var UUID;
    asset_name TEXT;
    i INT;
    names_array TEXT[] := ARRAY['تكييف كاريير 5 حصان', 'فرن كهربائي صناعي', 'ماكينة قهوة اسبريسو', 'ثلاجة عرض حلواني', 'سيستم كاشير متكامل'];
BEGIN
    FOR branch_record IN SELECT id, brand_id FROM public.branches LOOP
        FOR i IN 1..3 LOOP
            asset_name := names_array[1 + floor(random() * 5)];
            INSERT INTO public.maintenance_assets (branch_id, brand_id, name, serial_number, status, purchase_date, purchase_price)
            VALUES (
                branch_record.id, 
                branch_record.brand_id, 
                asset_name || ' (Asset ' || i || ')', 
                'SN-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
                'Active',
                CURRENT_DATE - (INTERVAL '1 day' * (365 + floor(random() * 365))),
                (random() * 5000 + 2000)::DECIMAL(12,2)
            );
        END LOOP;
    END LOOP;
END $$;

-- 3. SEED HISTORICAL TICKETS (~2,000 across 6 months)
DO $$
DECLARE
    asset_record RECORD;
    brand_name_var TEXT;
    mt_interval INT;
    v_created_at TIMESTAMPTZ;
    v_status public.ticket_status;
    k INT;
    ticket_count INT;
BEGIN
    FOR asset_record IN (
        SELECT ma.id, b.name_ar as brand_name, ma.branch_id 
        FROM public.maintenance_assets ma 
        JOIN public.brands b ON b.id = ma.brand_id
    ) LOOP
        -- Brand Bias
        IF asset_record.brand_name = 'Wahmi' THEN mt_interval := 45; 
        ELSIF asset_record.brand_name = 'Konafa & Basbousa' THEN mt_interval := 90;
        ELSE mt_interval := 120;
        END IF;

        ticket_count := 3 + floor(random() * 3);
        
        FOR k IN 1..ticket_count LOOP
            v_created_at := NOW() - (INTERVAL '1 day' * (k * mt_interval + floor(random() * 15)));
            CONTINUE WHEN v_created_at > NOW();
            
            v_status := 'closed';

            INSERT INTO public.tickets (
                branch_id, 
                asset_id, 
                fault_category, 
                description, 
                status, 
                priority, 
                created_at, 
                updated_at,
                maintenance_cost
            ) VALUES (
                asset_record.branch_id,
                asset_record.id,
                'صيانة دورية لـ ' || asset_record.brand_name,
                'تم رصد عطل فني في ' || v_created_at::date || '. تم إجراء الفحص والإصلاح اللازم.',
                v_status,
                CASE WHEN random() > 0.7 THEN 'urgent'::public.ticket_priority ELSE 'medium'::public.ticket_priority END,
                v_created_at,
                v_created_at + INTERVAL '2 days',
                (random() * 500 + 100)::DECIMAL(12,2)
            );
        END LOOP;
    END LOOP;
END $$;

COMMIT;

-- 4. FINAL READOUT
SELECT brand_name, count(*) as asset_count, AVG(avg_mtbf_days) as avg_mtbf 
FROM v_brand_reliability_analysis 
GROUP BY brand_name;

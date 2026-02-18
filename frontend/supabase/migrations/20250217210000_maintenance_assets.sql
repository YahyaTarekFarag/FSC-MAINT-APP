-- Phase 54: Advanced Asset Lifecycle
-- Create maintenance_assets table and link to tickets

-- 1. Create the new assets table
CREATE TABLE IF NOT EXISTS public.maintenance_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    serial_number TEXT UNIQUE,
    brand_id UUID REFERENCES public.brands(id),
    branch_id UUID REFERENCES public.branches(id) NOT NULL,
    purchase_date DATE,
    warranty_expiry DATE,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Under Repair', 'Scrapped')),
    qr_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.maintenance_assets ENABLE ROW LEVEL SECURITY;

-- 3. Admin Access Policy
CREATE POLICY "Admin full access on maintenance_assets" 
ON public.maintenance_assets FOR ALL 
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- 4. Branch Manager View Policy
CREATE POLICY "Manager view own branch assets"
ON public.maintenance_assets FOR SELECT
USING ( 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manager' 
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
);

-- 5. Update tickets table to include asset_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'asset_id') THEN
        ALTER TABLE public.tickets ADD COLUMN asset_id UUID REFERENCES public.maintenance_assets(id);
    END IF;
END $$;

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_maintenance_assets_updated_at
BEFORE UPDATE ON public.maintenance_assets
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- 7. (Optional/Data Migration) 
-- If old assets table exists, migrate data
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
        INSERT INTO public.maintenance_assets (id, name, serial_number, branch_id, purchase_date, warranty_expiry, status, qr_code)
        SELECT id, name, serial_number, branch_id, CAST(purchase_date AS DATE), CAST(warranty_expiry AS DATE), 
               CASE WHEN status = 'maintenance' THEN 'Under Repair' ELSE 'Active' END, qr_code
        FROM public.assets
        ON CONFLICT (serial_number) DO NOTHING;
    END IF;
END $$;

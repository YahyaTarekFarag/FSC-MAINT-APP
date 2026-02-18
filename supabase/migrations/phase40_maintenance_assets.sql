-- Phase 40: Maintenance Assets Management

-- 1. Create maintenance_assets table
CREATE TABLE IF NOT EXISTS maintenance_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100),
    brand_id UUID REFERENCES brands(id),
    status VARCHAR(50) CHECK (status IN ('Active', 'Under Repair', 'Scrapped')) DEFAULT 'Active',
    purchase_date DATE,
    warranty_expiry DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add asset_id to tickets if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'asset_id') THEN
        ALTER TABLE tickets ADD COLUMN asset_id UUID REFERENCES maintenance_assets(id);
    END IF;
END $$;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_assets_branch_id ON maintenance_assets(branch_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_assets_brand_id ON maintenance_assets(brand_id);
CREATE INDEX IF NOT EXISTS idx_tickets_asset_id ON tickets(asset_id);

-- 4. Add RLS Policies (Enable RLS first)
ALTER TABLE maintenance_assets ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view assets
CREATE POLICY "Authenticated users can view assets" ON maintenance_assets
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Admins and Managers can insert/update/delete assets
CREATE POLICY "Admins and Managers can manage assets" ON maintenance_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

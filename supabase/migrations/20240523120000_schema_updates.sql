-- Add category_id, purchase_price, and type to maintenance_assets

ALTER TABLE maintenance_assets
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES fault_categories(id),
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'Physical' CHECK (type IN ('Physical', 'Virtual'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_assets_category ON maintenance_assets(category_id);

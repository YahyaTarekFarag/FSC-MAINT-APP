-- Add asset_id to maintenance_schedules
ALTER TABLE public.maintenance_schedules
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.maintenance_assets(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_asset_id ON public.maintenance_schedules(asset_id);

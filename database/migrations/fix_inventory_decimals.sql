
-- Fix spare_parts quantity to allow decimals (e.g. for meters, liters)
ALTER TABLE public.spare_parts ALTER COLUMN quantity TYPE NUMERIC;

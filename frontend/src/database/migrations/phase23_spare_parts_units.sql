-- Add unit_id to spare_parts
ALTER TABLE public.spare_parts
ADD COLUMN IF NOT EXISTS unit_id bigint REFERENCES public.unit_types(id);

-- Add constraint to prevent negative stock
ALTER TABLE public.spare_parts
ADD CONSTRAINT non_negative_quantity CHECK (quantity >= 0);

-- Log this schema change
INSERT INTO public.system_logs (action_type, entity_name, details)
VALUES ('UPDATE', 'SCHEMA', '{"change": "Added unit_id to spare_parts and non-negative check"}');

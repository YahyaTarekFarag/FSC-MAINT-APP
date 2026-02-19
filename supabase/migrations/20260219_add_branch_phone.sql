-- Add missing phone column to branches table
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;

-- Ensure audit log or relevant indexes if needed
CREATE INDEX IF NOT EXISTS idx_branches_phone ON public.branches(phone);

COMMENT ON COLUMN public.branches.phone IS 'Contact phone number for the branch (used for WhatsApp notifications)';

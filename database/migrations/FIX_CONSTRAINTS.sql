-- FIX UNIQUE CONSTRAINTS (Idempotent)
-- Run this to enable "ON CONFLICT" upserts

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brands_name_ar_key') THEN
        ALTER TABLE public.brands ADD CONSTRAINT brands_name_ar_key UNIQUE (name_ar);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sectors_name_ar_key') THEN
        ALTER TABLE public.sectors ADD CONSTRAINT sectors_name_ar_key UNIQUE (name_ar);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'areas_name_ar_key') THEN
        ALTER TABLE public.areas ADD CONSTRAINT areas_name_ar_key UNIQUE (name_ar);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branches_name_ar_key') THEN
        ALTER TABLE public.branches ADD CONSTRAINT branches_name_ar_key UNIQUE (name_ar);
    END IF;
END $$;

ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;

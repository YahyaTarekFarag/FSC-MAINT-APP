-- Migration: Add address and phone columns to branches table
-- Run this in Supabase SQL Editor

ALTER TABLE branches
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS phone text;

-- Add a comment for documentation
COMMENT ON COLUMN branches.address IS 'Human-readable street address of the branch';
COMMENT ON COLUMN branches.phone IS 'Branch phone number for direct contact';

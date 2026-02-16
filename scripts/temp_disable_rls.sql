-- Alternative RLS Fix for Data Migration
-- If DISABLE ROW LEVEL SECURITY didn't work, try this:

-- First, check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('brands', 'sectors', 'areas', 'branches');

-- Force disable RLS (run as postgres/service role)
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('brands', 'sectors', 'areas', 'branches');
-- rowsecurity should be 'f' (false) for all tables

-- Alternative: Grant permissions directly
GRANT ALL ON public.brands TO anon, authenticated;
GRANT ALL ON public.sectors TO anon, authenticated;
GRANT ALL ON public.areas TO anon, authenticated;
GRANT ALL ON public.branches TO anon, authenticated;

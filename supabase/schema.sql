-- ========================================================
-- Refined Supabase Schema for Maintenance Management (V3)
-- ========================================================

-- 1. Enums (Drop if exists to avoid "already exists" errors)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS ticket_priority CASCADE;

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'technician');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- 2. Core Hierarchy Tables (Drop if exists)
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS areas CASCADE;
DROP TABLE IF EXISTS sectors CASCADE;
DROP TABLE IF EXISTS brands CASCADE;

-- Brands (e.g., McDonald's, B. Laban)
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Geographic Hierarchy
CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE NOT NULL,
    name_ar TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID REFERENCES areas(id) ON DELETE CASCADE NOT NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
    name_ar TEXT NOT NULL UNIQUE,
    location_lat DECIMAL(9,6),
    location_lng DECIMAL(9,6),
    google_map_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. User Profiles (RBAC)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role user_role DEFAULT 'technician' NOT NULL,
    specialization TEXT,
    assigned_sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL, -- For Managers
    assigned_area_id UUID REFERENCES areas(id) ON DELETE SET NULL,     -- For Technicians
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Maintenance Tickets
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status ticket_status DEFAULT 'open' NOT NULL,
    priority ticket_priority DEFAULT 'medium' NOT NULL,
    fault_category TEXT NOT NULL,
    fault_subcategory TEXT,
    description TEXT,
    images_url TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================
-- SECURITY (Row Level Security)
-- ========================================================

-- Enable RLS on all tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users can read their own profile
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- 2. Technicians: Only see branches in their assigned area
CREATE POLICY "Technicians see area branches" ON branches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.assigned_area_id = branches.area_id)
        )
    );

-- 3. Technicians: Only see tickets in their assigned area
CREATE POLICY "Technicians area-based ticket access" ON tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN branches b ON b.id = tickets.branch_id
            WHERE p.id = auth.uid()
            AND (p.role = 'admin' OR p.assigned_area_id = b.area_id)
        )
    );

-- 4. Managers: Only see data in their assigned sector (General read)
CREATE POLICY "Managers sector-based access" ON areas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role IN ('admin', 'manager')) 
            AND (profiles.role = 'admin' OR profiles.assigned_sector_id = areas.sector_id)
        )
    );

-- 5. General Read Access for Metadata (Authenticated users)
CREATE POLICY "Read Brands" ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read Sectors" ON sectors FOR SELECT TO authenticated USING (true);

-- ========================================================
-- TRIGGERS & FUNCTIONS
-- ========================================================

-- Auto-update updated_at for tickets
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'technician');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

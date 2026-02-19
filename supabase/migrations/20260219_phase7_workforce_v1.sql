-- Phase 7: Workforce Intelligence & Skill Matrix

-- 1. Create Skills Table
CREATE TABLE IF NOT EXISTS technician_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT, -- 'HVAC', 'Electrical', 'Plumbing', etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Link Profiles to Skills
CREATE TABLE IF NOT EXISTS profile_skills (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES technician_skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5) DEFAULT 3,
    PRIMARY KEY (profile_id, skill_id)
);

-- 3. Seed Default Skills
INSERT INTO technician_skills (name, category) VALUES
('تبريد وتكييف', 'HVAC'),
('توصيلات كهربائية', 'Electrical'),
('أعمال سباكة', 'Plumbing'),
('صيانة ماكينات قهوة', 'Mechanics'),
('إصلاح دوائر إلكترونية', 'Electronics'),
('أعمال نجارة', 'General')
ON CONFLICT (name) DO NOTHING;

-- 4. Technician Ranking View
-- Performance analytics for technicians
CREATE OR REPLACE VIEW v_technician_rankings AS
SELECT 
    p.id,
    p.full_name,
    COUNT(t.id) as completed_tickets,
    AVG(EXTRACT(EPOCH FROM (t.closed_at - t.started_at)) / 3600)::DECIMAL(10,2) as avg_completion_hours,
    p.specialization,
    (
        SELECT array_agg(ts.name) 
        FROM profile_skills ps 
        JOIN technician_skills ts ON ps.skill_id = ts.id 
        WHERE ps.profile_id = p.id
    ) as skill_matrix
FROM profiles p
LEFT JOIN tickets t ON p.id = t.technician_id AND t.status = 'closed'
GROUP BY p.id, p.full_name, p.specialization;

-- 5. RLS
ALTER TABLE technician_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for skills" ON technician_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow managers to update skills" ON technician_skills FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Users can manage their own skills" ON profile_skills FOR ALL TO authenticated USING (
    auth.uid() = profile_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

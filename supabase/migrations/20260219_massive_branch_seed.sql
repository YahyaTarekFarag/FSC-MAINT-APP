-- SOVEREIGN DATA DEPLOYMENT: 197 BRANCHES (Consolidated)
-- Includes 19 precise samples + 178 randomized clusters

BEGIN;

-- 1. CLEANUP
TRUNCATE branches RESTART IDENTITY CASCADE;

-- 2. ENSURE BRANDS
INSERT INTO brands (name_ar) VALUES 
('B-Laban'), 
('Konafa & Basbousa'), 
('Wahmi'), 
('Om Shaltat')
ON CONFLICT (name_ar) DO NOTHING;

-- 3. ENSURE SECTOR & AREA
INSERT INTO sectors (name_ar) VALUES ('القطاع السيادي الموحد') ON CONFLICT (name_ar) DO NOTHING;
INSERT INTO areas (name_ar, sector_id) 
SELECT 'الجمهورية ككل', id FROM sectors WHERE name_ar = 'القطاع السيادي الموحد'
ON CONFLICT (name_ar) DO NOTHING;

-- 4. INSERT PRECISE SAMPLES (19)
-- B-Laban (8)
INSERT INTO branches (name_ar, brand_id, area_id, location_lat, location_lng, address) VALUES
('ب لبن - وسط البلد', (SELECT id FROM brands WHERE name_ar = 'B-Laban'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 30.0519, 31.2396, 'شارع طلعت حرب - القاهرة'),
('ب لبن - مصر الجديدة', (SELECT id FROM brands WHERE name_ar = 'B-Laban'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 30.0910, 31.3255, 'الكوربة - شارع الأهرام'),
('ب لبن - مدينة نصر', (SELECT id FROM brands WHERE name_ar = 'B-Laban'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 30.0594, 31.3414, 'شارع عباس العقاد'),
('ب لبن - فيصل', (SELECT id FROM brands WHERE name_ar = 'B-Laban'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 30.0021, 31.1555, 'الجيزة - شارع فيصل الرئيسي'),
('ب لبن - سموحة', (SELECT id FROM brands WHERE name_ar = 'B-Laban'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 31.2185, 29.9575, 'الإسكندرية - ميدان فيكتور عمانويل'),
('ب لبن - طنطا', (SELECT id FROM brands WHERE name_ar = 'B-Laban'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 30.7911, 30.9981, 'شارع سعيد - الغربية'),
('ب لبن - المنصورة', (SELECT id FROM brands WHERE name_ar = 'B-Laban'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 31.0425, 31.3550, 'المشاية السفلية - الدقهلية'),
('ب لبن - أسيوط', (SELECT id FROM brands WHERE name_ar = 'B-Laban'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 27.1810, 31.1837, 'شارع الجمهورية - أسيوط');

-- Konafa & Basbousa (4)
INSERT INTO branches (name_ar, brand_id, area_id, location_lat, location_lng, address) VALUES
('كنافة وبسبوسة - عباس العقاد', (SELECT id FROM brands WHERE name_ar = 'Konafa & Basbousa'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 30.0595, 31.3415, 'مدينة نصر - بجوار ب لبن'),
('كنافة وبسبوسة - حلوان', (SELECT id FROM brands WHERE name_ar = 'Konafa & Basbousa'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 29.8413, 31.2985, 'شارع محمد سيد أحمد'),
('كنافة وبسبوسة - الألف مسكن', (SELECT id FROM brands WHERE name_ar = 'Konafa & Basbousa'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 30.1185, 31.3452, 'جسر السويس - ميدان الألف مسكن'),
('كنافة وبسبوسة - العصافرة', (SELECT id FROM brands WHERE name_ar = 'Konafa & Basbousa'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 31.2725, 30.0123, 'الإسكندرية - شارع جمال عبد الناصر');

-- Wahmi Burger (4)
INSERT INTO branches (name_ar, brand_id, area_id, location_lat, location_lng, address) VALUES
('وهمي برجر - الكوربة', (SELECT id FROM brands WHERE name_ar = 'Wahmi'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 30.0911, 31.3256, 'مصر الجديدة - شارع إبراهيم'),
('وهمي برجر - شيراتون', (SELECT id FROM brands WHERE name_ar = 'Wahmi'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 30.1080, 31.3810, 'شارع أنقرة - مساكن شيراتون'),
('وهمي برجر - 6 أكتوبر', (SELECT id FROM brands WHERE name_ar = 'Wahmi'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 29.9722, 30.9423, 'ميدان الحصري - أبراج الأمريكية'),
('وهمي برجر - محطة الرمل', (SELECT id FROM brands WHERE name_ar = 'Wahmi'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 31.2014, 29.8996, 'الإسكندرية - شارع عبد الخالق ثروت');

-- Om Shaltat (3)
INSERT INTO branches (name_ar, brand_id, area_id, location_lat, location_lng, address) VALUES
('عم شلتت - شيراتون', (SELECT id FROM brands WHERE name_ar = 'Om Shaltat'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 30.1075, 31.3805, 'سور نادي النادي - شيراتون'),
('عم شلتت - العطارين', (SELECT id FROM brands WHERE name_ar = 'Om Shaltat'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 31.1965, 29.9042, 'تقاطع النبي دانيال - الإسكندرية'),
('عم شلتت - المندرة', (SELECT id FROM brands WHERE name_ar = 'Om Shaltat'), (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل'), 31.2825, 30.0185, 'برج توليب - الإسكندرية');

-- 5. GENERATE REMAINDER (178)
DO $$
DECLARE
    i INT;
    brand_id_var UUID;
    area_id_var UUID;
BEGIN
    area_id_var := (SELECT id FROM areas WHERE name_ar = 'الجمهورية ككل' LIMIT 1);
    
    -- B-Laban Remainder (96)
    brand_id_var := (SELECT id FROM brands WHERE name_ar = 'B-Laban');
    FOR i IN 1..96 LOOP
        INSERT INTO branches (name_ar, brand_id, area_id, location_lat, location_lng, address)
        VALUES ('ب لبن - امتداد ' || i, brand_id_var, area_id_var, 30.0 + random() * 1.5, 31.0 + random() * 1.5, 'القاهرة - منطقة توسعية ' || i);
    END LOOP;

    -- Konafa Remainder (61)
    brand_id_var := (SELECT id FROM brands WHERE name_ar = 'Konafa & Basbousa');
    FOR i IN 1..61 LOOP
        INSERT INTO branches (name_ar, brand_id, area_id, location_lat, location_lng, address)
        VALUES ('كنافة وبسبوسة - انتشار ' || i, brand_id_var, area_id_var, 31.0 + random() * 0.5, 29.7 + random() * 1.0, 'الإسكندرية - منطقة توسعية ' || i);
    END LOOP;

    -- Wahmi Remainder (15)
    brand_id_var := (SELECT id FROM brands WHERE name_ar = 'Wahmi');
    FOR i IN 1..15 LOOP
        INSERT INTO branches (name_ar, brand_id, area_id, location_lat, location_lng, address)
        VALUES ('وهمي برجر - زون ' || i, brand_id_var, area_id_var, 29.8 + random() * 0.5, 30.8 + random() * 0.5, 'الجيزة/أكتوبر - زون ' || i);
    END LOOP;

    -- Om Shaltat Remainder (6)
    brand_id_var := (SELECT id FROM brands WHERE name_ar = 'Om Shaltat');
    FOR i IN 1..6 LOOP
        INSERT INTO branches (name_ar, brand_id, area_id, location_lat, location_lng, address)
        VALUES ('عم شلتت - توسع ' || i, brand_id_var, area_id_var, 31.0 + random() * 0.2, 31.2 + random() * 0.3, 'الدقهلية - زون ' || i);
    END LOOP;
END $$;

COMMIT;

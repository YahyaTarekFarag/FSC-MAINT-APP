-- 1. Create Virtual Legacy Assets for each branch
DO $$
DECLARE
    branch_rec RECORD;
    v_asset_id UUID;
BEGIN
    FOR branch_rec IN SELECT id, name_ar FROM branches LOOP
        -- Check if virtual asset exists
        SELECT id INTO v_asset_id FROM maintenance_assets 
        WHERE branch_id = branch_rec.id AND name = 'أصل افتراضي (بيانات قديمة)';
        
        IF v_asset_id IS NULL THEN
            INSERT INTO maintenance_assets (name, branch_id, status, type)
            VALUES ('أصل افتراضي (بيانات قديمة)', branch_rec.id, 'Active', 'Virtual')
            RETURNING id INTO v_asset_id;
        END IF;

        -- 2. Link orphaned tickets
        UPDATE tickets 
        SET asset_id = v_asset_id
        WHERE branch_id = branch_rec.id 
        AND asset_id IS NULL;
        
    END LOOP;
END $$;

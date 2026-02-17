const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

// Setup Supabase (Service Role Required for Auth Admin)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY
);

function cleanArabicText(text) {
    if (!text) return text;
    return String(text)
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى$/g, 'ي')
        .replace(/ة$/g, 'ه');
}

function mapRole(arabicRole) {
    const role = cleanArabicText(arabicRole).toLowerCase();

    if (role.includes('مدير') || role.includes('منسق') || role.includes('امين مخزن')) {
        return 'manager';
    }
    if (role.includes('فني') || role.includes('صيانه') || role.includes('مساعد')) {
        return 'technician';
    }
    // Default fallback
    return 'technician'; // Assume most are technicians
}

async function main() {
    console.log('🚀 Quick Import: Profiles (Team Members)');

    // 1. Fetch Reference Data (Sectors & Areas)
    console.log('📦 Fetching Sectors and Areas...');
    const { data: sectors } = await supabase.from('sectors').select('id, name_ar');
    const { data: areas } = await supabase.from('areas').select('id, name_ar, sector_id');

    // Create maps for quick lookup
    const sectorMap = new Map((sectors || []).map(s => [cleanArabicText(s.name_ar), s.id]));
    const areaMap = new Map((areas || []).map(a => [cleanArabicText(a.name_ar), a.id]));

    console.log(`✓ Loaded ${sectorMap.size} sectors and ${areaMap.size} areas.`);

    // 2. Fetch All Existing Users (Page handling)
    console.log('👥 Fetching Existing Users...');
    let allUsers = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 1000 });
        if (error || !users || users.length === 0) {
            hasMore = false;
        } else {
            allUsers = [...allUsers, ...users];
            page++;
            if (users.length < 1000) hasMore = false;
        }
    }
    const userMap = new Map(allUsers.map(u => [u.email, u.id]));
    console.log(`✓ Found ${userMap.size} existing users.`);

    // 3. Process Excel
    const filePath = path.join(process.cwd(), 'data', 'maintenance team members.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const rows = data.slice(4); // Data starts at row index 4

    console.log(`Processing ${rows.length} rows from Excel...`);

    let successCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
        // Indices: 1: Sector, 2: Area, 5: Name, 6: Code, 8: Role
        const name = row[5];
        const code = row[6];
        const roleAr = row[8];
        const sectorNameRaw = row[1];
        const areaNameRaw = row[2];

        if (!name || !code) continue;

        const cleanName = cleanArabicText(name);
        const appRole = mapRole(roleAr || '');
        const email = `u${code}@blaban.com`;
        const password = 'password123';

        // Find IDs
        const sectorId = sectorMap.get(cleanArabicText(sectorNameRaw));
        const areaId = areaMap.get(cleanArabicText(areaNameRaw));

        // 1. Get or Create Auth User
        let userId = userMap.get(email);

        if (!userId) {
            const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: { full_name: cleanName }
            });

            if (authError) {
                console.log(`❌ Auth Error ${email}: ${authError.message}`);
                continue;
            }
            userId = newUser.user.id;
            createdCount++;
        }

        if (userId) {
            // 2. Upsert Profile
            const profileData = {
                id: userId,
                full_name: cleanName,
                role: appRole,
                specialization: roleAr ? String(roleAr).substring(0, 50) : null,
                assigned_sector_id: sectorId || null,
                assigned_area_id: areaId || null,
                status: 'active'
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert(profileData);

            if (profileError) {
                console.log(`❌ Profile Error ${cleanName}: ${profileError.message}`);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`\n🎉 Import Complete!`);
    console.log(`- Created Users: ${createdCount}`);
    console.log(`- Updated Profiles: ${updatedCount}`);
}

main().catch(console.error);

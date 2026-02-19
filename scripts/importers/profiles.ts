import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { cleanArabicText } from '../utils/data-cleaner';

export async function importProfiles(dryRun = false): Promise<void> {
    console.log('\n👥 Importing Profiles (Team Members)...');

    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Reference Data
    const { data: sectors } = await supabase.from('sectors').select('id, name_ar');
    const { data: areas } = await supabase.from('areas').select('id, name_ar');

    const sectorMap = new Map((sectors || []).map(s => [cleanArabicText(s.name_ar), s.id]));
    const areaMap = new Map((areas || []).map(a => [cleanArabicText(a.name_ar), a.id]));

    // 2. Fetch Existing Users
    let allUsers: any[] = [];
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
    const userEmailMap = new Map(allUsers.map(u => [u.email, u.id]));

    // 3. Process Excel
    const filePath = path.join(__dirname, '../../data/maintenance team members.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const rows = data.slice(4); // Data starts at row index 4

    console.log(`Processing ${rows.length} rows from Excel...`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
        const name = row[5];
        const code = row[6];
        const roleAr = row[8];
        const sectorNameRaw = row[1];
        const areaNameRaw = row[2];

        if (!name || !code) continue;

        const cleanName = cleanArabicText(name);
        const email = `u${code}@blaban.com`;
        const password = 'password123';

        // Map Role
        let appRole: 'manager' | 'technician' | 'admin' = 'technician';
        const roleLower = cleanArabicText(roleAr || '').toLowerCase();
        if (roleLower.includes('مدير') || roleLower.includes('منسق') || roleLower.includes('امين مخزن')) {
            appRole = 'manager';
        }

        const sectorId = sectorMap.get(cleanArabicText(sectorNameRaw));
        const areaId = areaMap.get(cleanArabicText(areaNameRaw));

        let userId = userEmailMap.get(email);

        if (!userId && !dryRun) {
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

        if (userId && !dryRun) {
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
        } else if (dryRun) {
            console.log(`🏃 Dry Run: would process ${cleanName} (${email}) as ${appRole}`);
        }
    }

    if (!dryRun) {
        console.log(`\n🎉 Profiles Import Complete! Created: ${createdCount}, Updated: ${updatedCount}`);
    }
}

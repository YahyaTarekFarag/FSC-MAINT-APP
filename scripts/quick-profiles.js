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

    const filePath = path.join(process.cwd(), 'data', 'maintenance team members.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Read raw data
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Data starts at row index 4 (row 5 in Excel)
    // Headers/Title occupy first 4 rows
    const rows = data.slice(4);

    console.log(`Found ${rows.length} rows to process`);

    let successCount = 0;

    for (const row of rows) {
        // Indices based on inspection:
        // 1: Sector, 2: Area, 5: Name, 6: Code, 8: Role

        const name = row[5];
        const code = row[6];
        const roleAr = row[8];
        const sectorName = row[1];
        const areaName = row[2];

        if (!name || !code) continue;

        const cleanName = cleanArabicText(name);
        const appRole = mapRole(roleAr || '');
        const email = `u${code}@blaban.com`;
        const password = 'password123';

        // 1. Create Auth User
        // Check if exists first? Or just try create and catch error
        let userId = null;

        // Try getting by email first to avoid error spam
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === email);

        if (existingUser) {
            userId = existingUser.id;
            // console.log(`User exists: ${email}`);
        } else {
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
            console.log(`✓ Created Auth User: ${email}`);
        }

        if (userId) {
            // 2. Upsert Profile
            // Need sector/area IDs? 
            // We could lookup sector/area by name if we wanted to be thorough.
            // For now, let's just get the profile in with the name and role.

            const profileData = {
                id: userId,
                full_name: cleanName,
                role: appRole,
                specialization: roleAr ? String(roleAr).substring(0, 50) : null,
                // assigned_sector_id: ... // TODO: Lookup if critical
                // assigned_area_id: ...
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert(profileData);

            if (profileError) {
                console.log(`❌ Profile Error ${cleanName}: ${profileError.message}`);
            } else {
                successCount++;
            }
        }
    }

    console.log(`\n✓ Successfully imported ${successCount} profiles`);
}

main().catch(console.error);

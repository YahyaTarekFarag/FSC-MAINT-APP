import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX_LIB = require('xlsx');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const dataDir = '../data';

async function seed() {
    console.log('--- Starting Ultra-Verbose Data Seed ---');

    console.log('--- Step 1: Brands ---');
    const brandsFile = path.join(dataDir, 'company brands.xlsx');
    const brandsWB = XLSX_LIB.readFile(brandsFile);
    const brandsData = XLSX_LIB.utils.sheet_to_json(brandsWB.Sheets[brandsWB.SheetNames[0]]) as any[];
    console.log(`Found ${brandsData.length} brands.`);
    for (const row of brandsData) {
        const name = row['البراند'];
        if (name) {
            console.log(`Upserting brand: ${name}`);
            await supabase.from('brands').upsert({ name_ar: name }, { onConflict: 'name_ar' });
        }
    }

    console.log('--- Step 2: Hierarchy & Staff ---');
    const staffFile = path.join(dataDir, 'maintenance team members.xlsx');
    const staffWB = XLSX_LIB.readFile(staffFile);
    const staffRows = XLSX_LIB.utils.sheet_to_json(staffWB.Sheets[staffWB.SheetNames[0]], { header: 1 }) as any[][];
    console.log(`Found ${staffRows.length} total rows in staff sheet.`);

    for (let i = 0; i < staffRows.length; i++) {
        const row = staffRows[i];
        const sectorName = row[1];
        const areaName = row[2];
        const fullName = row[5];
        const jobTitle = row[8];

        if (!fullName || fullName === 'الاسم' || fullName === 'محمد سعد حسان حسان' ? false : !sectorName) {
            // Basic filter to skip headers or empty rows
            continue;
        }

        // Clean names
        const cleanName = String(fullName).trim();
        if (cleanName === 'الاسم' || cleanName === 'null' || cleanName === 'undefined') continue;

        console.log(`Row ${i} - Sector: ${sectorName}, Area: ${areaName}, Name: ${cleanName}`);

        const { data: sector, error: se } = await supabase.from('sectors').upsert({ name_ar: String(sectorName) }, { onConflict: 'name_ar' }).select().single();
        if (se) console.error(`Sector Error (Row ${i}):`, se.message);

        let areaId = null;
        if (sector && areaName) {
            const { data: area, error: ae } = await supabase.from('areas').upsert({ sector_id: sector.id, name_ar: String(areaName) }, { onConflict: 'name_ar' }).select().single();
            if (ae) console.error(`Area Error (Row ${i}):`, ae.message);
            areaId = area?.id;
        }

        const email = `user_${i}@system.com`;
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: cleanName }
        });

        let userId = authUser?.user?.id;
        if (authError) {
            if (authError.message.includes('already registered')) {
                const { data: existing } = await supabase.auth.admin.listUsers();
                userId = existing.users.find(u => u.email === email)?.id;
            } else {
                console.error(`Auth Error (Row ${i}):`, authError.message);
            }
        }

        if (userId) {
            const role = String(jobTitle).includes('مدير') ? 'manager' : 'technician';
            const { error: pe } = await supabase.from('profiles').upsert({
                id: userId,
                full_name: cleanName,
                role: role,
                specialization: jobTitle ? String(jobTitle) : null,
                assigned_sector_id: sector?.id,
                assigned_area_id: areaId
            });
            if (pe) console.error(`Profile Error (Row ${i}):`, pe.message);
            else console.log(`Seeded: ${cleanName}`);
        }
    }

    console.log('--- Step 3: Branches ---');
    const branchesFile = path.join(dataDir, 'branches names and addresses .xlsx');
    const branchesWB = XLSX_LIB.readFile(branchesFile);
    const branchesData = XLSX_LIB.utils.sheet_to_json(branchesWB.Sheets[branchesWB.SheetNames[0]]) as any[];
    console.log(`Found ${branchesData.length} branch rows.`);

    // Re-fetch all created areas and brands
    const { data: allAreas } = await supabase.from('areas').select('id, name_ar');
    const { data: allBrands } = await supabase.from('brands').select('id, name_ar');

    for (const row of branchesData) {
        const branchNameAr = row['اسم الفرع '] || row['اسم الفرع'];
        const zone = row['Zone'];
        const lat = row['Lat'];
        const lng = row['Lng'];

        if (!branchNameAr) continue;

        const brand = allBrands?.find(b =>
            branchNameAr.replace(/\s+/g, '').includes(b.name_ar.replace(/\s+/g, ''))
        );
        const area = allAreas?.find(a => branchNameAr.includes(a.name_ar) || (zone && a.name_ar.includes(zone)));

        const targetAreaId = area?.id || allAreas?.[0]?.id;
        if (!targetAreaId) {
            console.warn(`No area found for branch ${branchNameAr}, and no fallback area available.`);
            continue;
        }

        const { error: bre } = await supabase.from('branches').upsert({
            name_ar: String(branchNameAr),
            brand_id: brand?.id,
            area_id: targetAreaId,
            location_lat: lat,
            location_lng: lng
        }, { onConflict: 'name_ar' });

        if (bre) console.error(`Branch Error (${branchNameAr}):`, bre.message);
        else console.log(`Seeded Branch: ${branchNameAr}`);
    }

    console.log('--- Seeding Completed Successfully ---');
}

seed().catch(err => {
    console.error('Seed script failed:', err);
});

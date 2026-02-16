import { createClient } from '@supabase/supabase-js';
import { readExcelFile } from './utils/excel-reader';
import { cleanArabicText } from './utils/data-cleaner';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🚀 Quick Import: Zones as Sectors & Branches');

    // 1. Read Branches File
    const filePath = path.join(process.cwd(), 'data', 'branches names and addresses .xlsx');
    const rows = readExcelFile(filePath);

    console.log(`Found ${rows.length} branches`);

    // 2. Extract Unique Zones (to specific mapped Sectors)
    const zoneMap = new Map<string, string>(); // Zone -> SectorId
    const distinctZones = new Set<string>();

    rows.forEach(row => {
        const zone = row['Zone'] ? String(row['Zone']).trim() : null;
        if (zone) distinctZones.add(zone);
    });

    console.log(`Found ${distinctZones.size} zones:`, Array.from(distinctZones));

    // 3. Create Sectors for Zones
    for (const zone of distinctZones) {
        // Map English Zone to Arabic Name if possible, or just use it
        let nameAr = zone;
        if (zone === 'Cairo') nameAr = 'القاهرة';
        if (zone === 'Alex') nameAr = 'الإسكندرية';
        if (zone === 'Delta') nameAr = 'الدلتا';
        if (zone === 'Giza') nameAr = 'الجيزة';

        console.log(`Creating Sector: ${nameAr} (${zone})`);

        const { data, error } = await supabase
            .from('sectors')
            .upsert({ name_ar: nameAr }, { onConflict: 'name_ar' })
            .select('id')
            .single();

        if (error) {
            console.error(`Error creating sector ${nameAr}:`, error.message);
        } else {
            zoneMap.set(zone, data.id);
        }
    }

    // 4. Create Branches
    for (const row of rows) {
        const zone = row['Zone'] ? String(row['Zone']).trim() : null;
        const branchName = row['Branch Name'];
        const branchNameAr = row['اسم الفرع ']; // Note space at end
        const address = row['العنوان'];

        if (!branchNameAr) continue;

        const sectorId = zone ? zoneMap.get(zone) : null;

        // Clean name
        const cleanName = cleanArabicText(String(branchNameAr));

        const branchData = {
            name: cleanName,
            address: address ? String(address) : null,
            sector_id: sectorId,
            status: 'active'
        };

        // console.log(`Creating Branch: ${cleanName}`, branchData);

        const { error } = await supabase
            .from('branches')
            .upsert(branchData, { onConflict: 'name' });

        if (error) {
            console.log(`❌ Error creating branch ${cleanName}: ${error.message}`);
        } else {
            // console.log(`✓ Created/Updated branch: ${cleanName}`);
        }
    }

    console.log('✓ Branches import complete');
}

main().catch(console.error);

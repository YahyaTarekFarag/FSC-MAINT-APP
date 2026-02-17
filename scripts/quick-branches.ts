import { createClient } from '@supabase/supabase-js';
import { readExcelFile } from './utils/excel-reader';
import { cleanArabicText } from './utils/data-cleaner';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is available (or use helper)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🚀 Quick Import: Branches (with Auto-Hierarchy)');

    // 1. Get Default Brand (B. Laban)
    // We need a brand ID for the branches.
    let brandId: string | null = null;
    const { data: brands } = await supabase.from('brands').select('id').eq('name_ar', 'بلبن').limit(1);
    if (brands && brands.length > 0) {
        brandId = brands[0].id;
    } else {
        // Create if not exists
        const { data: newBrand } = await supabase.from('brands').insert({ name_ar: 'بلبن' }).select('id').single();
        if (newBrand) brandId = newBrand.id;
    }
    console.log(`Using Brand ID: ${brandId}`);

    if (!brandId) {
        console.error('❌ Could not find or create brand "بلبن". Aborting.');
        return;
    }

    // 2. Read Branches File
    const filePath = path.join(process.cwd(), 'data', 'branches names and addresses .xlsx');
    const rows = readExcelFile(filePath);

    console.log(`Found ${rows.length} branches to process`);

    // 3. Process Zones -> Sectors -> Areas
    // Map: ZoneName -> AreaID
    const zoneToAreaMap = new Map<string, string>();

    const distinctZones = new Set<string>();
    rows.forEach(row => {
        const zone = row['Zone'] ? String(row['Zone']).trim() : null;
        if (zone) distinctZones.add(zone);
    });

    console.log(`Found ${distinctZones.size} distinct zones.`);

    for (const zone of distinctZones) {
        // Map English Zone to Arabic Name
        let sectorNameAr = zone;
        if (zone === 'Cairo') sectorNameAr = 'القاهرة';
        if (zone === 'Alex') sectorNameAr = 'الإسكندرية';
        if (zone === 'Delta') sectorNameAr = 'الدلتا';
        if (zone === 'Giza') sectorNameAr = 'الجيزة';
        if (zone === 'Upper Egypt') sectorNameAr = 'الصعيد';

        // A. Get or Create Sector
        let sectorId: string | null = null;
        const { data: existingSector } = await supabase.from('sectors').select('id').eq('name_ar', sectorNameAr).maybeSingle();

        if (existingSector) {
            sectorId = existingSector.id;
        } else {
            const { data: newSector, error } = await supabase.from('sectors').insert({ name_ar: sectorNameAr }).select('id').single();
            if (newSector) sectorId = newSector.id;
            else console.error(`Error creating sector ${sectorNameAr}:`, error?.message);
        }

        if (!sectorId) continue;

        // B. Get or Create "General Area" for this Zone
        // We call it just the sector name (e.g. area "Cairo" in sector "Cairo") or "General"
        // Let's use the Sector Name as the Area Name for simplicity, as per previous logic assumptions
        const areaNameAr = sectorNameAr;

        let areaId: string | null = null;
        const { data: existingArea } = await supabase.from('areas').select('id').eq('name_ar', areaNameAr).eq('sector_id', sectorId).maybeSingle();

        if (existingArea) {
            areaId = existingArea.id;
        } else {
            const { data: newArea, error } = await supabase.from('areas').insert({
                name_ar: areaNameAr,
                sector_id: sectorId
            }).select('id').single();

            if (newArea) {
                areaId = newArea.id;
                //   console.log(`   Created Area: ${areaNameAr}`);
            }
            else console.error(`   Error creating area ${areaNameAr}:`, error?.message);
        }

        if (areaId) {
            zoneToAreaMap.set(zone, areaId);
        }
    }

    // 4. Create Branches
    console.log('Inserting/Updating branches...');
    let successCount = 0;

    for (const row of rows) {
        const zone = row['Zone'] ? String(row['Zone']).trim() : null;
        const branchNameAr = row['اسم الفرع '];
        const address = row['العنوان'];

        if (!branchNameAr || !zone) continue;

        const areaId = zoneToAreaMap.get(zone);
        if (!areaId) {
            //   console.warn(`Skipping branch ${branchNameAr}: No area for zone ${zone}`);
            continue;
        }

        const cleanName = cleanArabicText(String(branchNameAr));

        const branchData = {
            name_ar: cleanName,
            address: address ? String(address) : null,
            area_id: areaId,
            brand_id: brandId
            // location_lat, location_lng could be parsed if available
        };

        const { error } = await supabase
            .from('branches')
            .upsert(branchData, { onConflict: 'name_ar' });

        if (error) {
            console.error(`❌ Error branch ${cleanName}: ${error.message}`);
        } else {
            successCount++;
        }
    }

    console.log(`✓ Completed. Successfully processed ${successCount} branches.`);
}

main().catch(console.error);

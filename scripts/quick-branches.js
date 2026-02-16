const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

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

async function main() {
    console.log('🚀 Quick Import: Zones -> Sectors -> Areas -> Branches (Retry)');

    // 0. Get "B. Laban" Brand ID
    let brandId = null;
    const { data: brands } = await supabase
        .from('brands')
        .select('id, name_ar')
        .limit(10);

    const blaban = brands?.find(b => cleanArabicText(b.name_ar).includes('بلبن'));
    if (blaban) {
        brandId = blaban.id;
        console.log(`✓ Found Brand: ${blaban.name_ar} (${brandId})`);
    }

    // 1. Read Branches File
    const filePath = path.join(process.cwd(), 'data', 'branches names and addresses .xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${rows.length} branches to process`);

    // 2. Extract Unique Zones
    const zones = new Set();
    rows.forEach(r => {
        if (r['Zone']) zones.add(String(r['Zone']).trim());
    });

    // 3. Create Sectors & Areas for Zones
    const areaMap = new Map(); // ZoneName -> AreaId

    for (const zone of zones) {
        let nameAr = zone;
        if (zone === 'Cairo') nameAr = 'القاهرة';
        else if (zone === 'Alex') nameAr = 'الاسكندرية';
        else if (zone === 'Delta') nameAr = 'الدلتا';
        else if (zone === 'Giza') nameAr = 'الجيزة';
        else if (zone === 'Canal') nameAr = 'القناة';
        else if (zone === 'Upper Egypt') nameAr = 'الصعيد';
        else if (zone === 'Red Sea') nameAr = 'البحر الاحمر';

        // 3a. Create/Get Sector
        let sectorId = null;

        // Try select first
        const { data: existingSector } = await supabase
            .from('sectors')
            .select('id')
            .eq('name_ar', nameAr)
            .maybeSingle();

        if (existingSector) {
            sectorId = existingSector.id;
        } else {
            const { data: newSector, error: sError } = await supabase
                .from('sectors')
                .insert({ name_ar: nameAr })
                .select('id')
                .single();
            if (newSector) sectorId = newSector.id;
            else if (sError) console.error(`Error creating sector ${nameAr}:`, sError.message);
        }

        if (sectorId) {
            // 3b. Create/Get Area
            // Area name = Sector name (simplification)
            const areaName = nameAr;

            let areaId = null;

            // Try select first
            const { data: existingArea } = await supabase
                .from('areas')
                .select('id')
                .eq('name_ar', areaName)
                .eq('sector_id', sectorId)
                .maybeSingle(); // Use maybeSingle to avoid 406/JSON error if multiple or none

            if (existingArea) {
                areaId = existingArea.id;
            } else {
                const { data: newArea, error: aError } = await supabase
                    .from('areas')
                    .insert({
                        name_ar: areaName,
                        sector_id: sectorId
                    })
                    .select('id')
                    .single();

                if (newArea) areaId = newArea.id;
                else if (aError) console.error(`Error creating area ${areaName}:`, aError.message);
            }

            if (areaId) {
                areaMap.set(zone, areaId);
                console.log(`✓ Mapped ${zone} -> Area ${areaId}`);
            }
        }
    }

    console.log(`✓ Mapped ${areaMap.size} zones to areas`);

    // 4. Create Branches
    console.log('\nImporting Branches...');
    let successCount = 0;

    for (const row of rows) {
        const zone = row['Zone'] ? String(row['Zone']).trim() : null;
        const branchNameAr = row['اسم الفرع '];

        if (!branchNameAr) continue;

        const areaId = zone ? areaMap.get(zone) : null;
        const cleanName = cleanArabicText(branchNameAr);

        if (!areaId) {
            // console.log(`⚠️ Skipping ${branchNameAr} - No Area`);
            continue;
        }

        // Upsert Branch
        // We know 'name_ar' is the constraint or unique key hopefully
        // If not, we try explicit Select then Insert/Update

        const branchData = {
            name_ar: cleanName, // CORRECT COLUMN NAME
            area_id: areaId,    // CORRECT COLUMN NAME
            brand_id: brandId,
            // location_lat: null,
            // location_lng: null,
            // google_map_link: null // No address column, skipping
            // status: 'active' // No status column
        };
        const { error } = await supabase
            .from('branches')
            .upsert(branchData, { onConflict: 'name_ar' });

        if (error) {
            console.log(`❌ Error ${cleanName}: ${error.message}`);
        } else {
            successCount++;
        }
    }

    console.log(`\n✓ Successfully imported ${successCount} branches`);
}

main().catch(console.error);

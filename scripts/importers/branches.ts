import { createClient } from '@supabase/supabase-js';
import { readExcelFile } from '../utils/excel-reader';
import { cleanArabicText, validateRequired } from '../utils/data-cleaner';
import * as path from 'path';

interface BranchRow {
    'اسم الفرع'?: string;
    'Branch Name'?: string;
    'الفرع'?: string;
    'المنطقة'?: string;
    'Area'?: string;
    'الماركة'?: string;
    'Brand'?: string;
    'العنوان'?: string;
    'Address'?: string;
    'الموقع'?: string;
    'Location'?: string;
    [key: string]: any;
}

export async function importBranches(dryRun = false): Promise<void> {
    console.log('\n🏢 Importing Branches...');

    // Create Supabase client here (after env vars are loaded)
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const filePath = path.join(__dirname, '../../data/branches names and addresses .xlsx');

    try {
        // First, fetch areas and brands for lookup
        const { data: areas, error: areasError } = await supabase
            .from('areas')
            .select('id, name_ar');

        if (areasError) throw areasError;

        const { data: brands, error: brandsError } = await supabase
            .from('brands')
            .select('id, name_ar');

        if (brandsError) throw brandsError;

        // Fetch Sector -> Area mapping for fallback
        const { data: sectorAreas, error: saError } = await supabase
            .from('areas')
            .select('id, name_ar, sector_id, sectors(name_ar)');

        if (saError) throw saError;

        // Build lookup maps
        const areaMap = new Map<string, string>();
        areas?.forEach((a: any) => areaMap.set(a.name_ar, a.id));

        const brandMap = new Map<string, string>();
        brands?.forEach((b: any) => brandMap.set(b.name_ar, b.id));

        const sectorFallbackMap = new Map<string, string>();
        sectorAreas?.forEach((sa: any) => {
            const sectorName = cleanArabicText(sa.sectors?.name_ar).toLowerCase();
            if (sectorName && !sectorFallbackMap.has(sectorName)) {
                sectorFallbackMap.set(sectorName, sa.id);
            }
        });

        // Add specific common English to Sector/Area mappings
        const manualMap: Record<string, string> = {
            'delta': 'الدلتا',
            'deltas': 'الدلتا',
            'cairo': 'القاهرة',
            'alex': 'الإسكندرية',
            'upper egypt': 'الصعيد',
            'canal': 'الدلتا والقناة',
            'giza': 'قطاع القاهره والجيزه (السواح)'
        };

        console.log(`Loaded ${areas?.length || 0} areas, ${brands?.length || 0} brands, and ${sectorFallbackMap.size} sector fallbacks`);

        // Read Excel file
        const rows = readExcelFile(filePath) as BranchRow[];
        console.log(`Found ${rows.length} rows in Excel file`);

        if (rows.length > 0) {
            console.log('Sample row:', rows[0]);
            console.log('Available columns:', Object.keys(rows[0]));
        }

        const branches: any[] = [];

        const errors: { row: number; error: string }[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Note: 'اسم الفرع ' has a trailing space in the Excel file
                const branchName = row['اسم الفرع '] || row['Branch Name'] || row['الفرع'] || row['name'];
                const areaName = row['Zone'] || row['المنطقة'] || row['Area'] || row['area'];
                const brandName = row['الماركة'] || row['Brand'] || row['brand'];
                const location = row['الموقع'] || row['Location'] || row['location'];
                const address = row['العنوان'] || row['Address'] || row['address'];

                const cleanedBranchName = validateRequired(cleanArabicText(branchName), 'Branch Name');
                const cleanedAreaName = validateRequired(cleanArabicText(areaName), 'Area Name');
                const cleanedBrandName = cleanArabicText(brandName);

                let areaId = areaMap.get(cleanedAreaName);

                // Fallback 1: Manual Mapping (English to Arabic)
                if (!areaId) {
                    const mappedName = manualMap[cleanedAreaName.toLowerCase()];
                    if (mappedName) {
                        areaId = areaMap.get(cleanArabicText(mappedName)) || sectorFallbackMap.get(cleanArabicText(mappedName).toLowerCase());
                    }
                }

                // Fallback 2: Sector matching (Case insensitive)
                if (!areaId) {
                    areaId = sectorFallbackMap.get(cleanedAreaName.toLowerCase());
                }

                if (!areaId) {
                    throw new Error(`Area or Sector not found: ${cleanedAreaName}`);
                }

                let brandId: string | null = null;
                if (cleanedBrandName) {
                    brandId = brandMap.get(cleanedBrandName) || null;
                    if (!brandId) {
                        console.warn(`   ⚠️  Brand not found for row ${i + 2}: ${cleanedBrandName}`);
                    }
                }

                // Fallback: If no brand found, use "بلبن" or the first available brand
                if (!brandId) {
                    brandId = brandMap.get('بلبن') || brandMap.get('B. Laban') || Array.from(brandMap.values())[0] || null;
                }

                if (!brandId) {
                    throw new Error(`Critical: No brands found in database to link branch with.`);
                }

                // Default Cairo Coordinates with Jitter
                const baseLat = 30.0444;
                const baseLng = 31.2357;
                const jitter = () => (Math.random() - 0.5) * 0.05;

                const payload: any = {
                    name_ar: cleanedBranchName,
                    area_id: areaId,
                    brand_id: brandId,
                    location_lat: baseLat + jitter(),
                    location_lng: baseLng + jitter()
                };

                if (location && typeof location === 'string' && location.includes('http')) {
                    payload.google_map_link = location;
                }

                branches.push(payload);

            } catch (error) {
                errors.push({
                    row: i + 2,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        console.log(`✓ Processed ${branches.length} valid branches`);

        if (errors.length > 0) {
            console.log(`⚠️  ${errors.length} rows had errors:`);
            errors.slice(0, 10).forEach(e => console.log(`   Row ${e.row}: ${e.error}`));
        }

        if (!dryRun && branches.length > 0) {
            const { data, error } = await supabase
                .from('branches')
                .upsert(branches, { onConflict: 'name_ar' });

            if (error) throw error;

            console.log(`✓ Successfully imported ${branches.length} branches`);
        } else if (dryRun) {
            console.log('🏃 Dry run - sample branches:', branches.slice(0, 3));
        }

    } catch (error) {
        console.error('❌ Error importing branches:', error);
        throw error;
    }
}

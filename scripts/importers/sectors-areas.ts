import { createClient } from '@supabase/supabase-js';
import { readExcelFile, getSheetNames } from '../utils/excel-reader';
import { cleanArabicText, validateRequired } from '../utils/data-cleaner';
import * as path from 'path';
import * as XLSX from 'xlsx';

export async function importSectorsAndAreas(dryRun = false): Promise<void> {
    console.log('\n🗺️  Importing Sectors and Areas (Enhanced Parser)...');

    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
    console.log('🔑 Using key type:', process.env.VITE_SUPABASE_SERVICE_KEY ? 'SERVICE_ROLE' : 'ANON');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const filePath = path.join(__dirname, '../../data/branches and sectors.xlsx');

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        console.log(`Sheet range: Cols ${range.s.c}-${range.e.c}, Rows ${range.s.r}-${range.e.r}`);

        // Headers are at row 2 (0-indexed) based on the range output
        const headerRow = 2;
        const sectorColumns: { colIndex: number; sectorName: string }[] = [];

        console.log('\n--- Reading Sector Headers ---');
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
            const cell = worksheet[cellAddress];

            if (cell && cell.v) {
                const sectorName = cleanArabicText(String(cell.v));
                if (sectorName && sectorName.length > 3) {
                    sectorColumns.push({ colIndex: col, sectorName });
                    console.log(`  Column ${String.fromCharCode(65 + col)} (row ${headerRow + 1}): "${sectorName}"`);
                }
            }
        }

        console.log(`\n✓ Found ${sectorColumns.length} sectors`);

        const sectorsMap = new Map<string, Set<string>>();

        console.log('\n--- Reading Areas ---');
        for (const { colIndex, sectorName } of sectorColumns) {
            const areasSet = new Set<string>();

            for (let row = headerRow + 1; row <= range.e.r; row++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
                const cell = worksheet[cellAddress];

                if (cell && cell.v) {
                    const areaName = cleanArabicText(String(cell.v));
                    if (areaName && areaName.length > 2) {
                        areasSet.add(areaName);
                    }
                }
            }

            if (areasSet.size > 0) {
                sectorsMap.set(sectorName, areasSet);
                console.log(`  ✓ "${sectorName}" → ${areasSet.size} areas`);
            }
        }

        console.log(`\n✓ Total: ${sectorsMap.size} sectors with areas`);

        // Insert Sectors
        console.log('\n--- Inserting Sectors ---');
        const sectors: { name_ar: string }[] = [];
        for (const [sectorName] of sectorsMap) {
            sectors.push({ name_ar: sectorName });
        }

        let sectorIdMap = new Map<string, string>();

        if (!dryRun && sectors.length > 0) {
            const { data: sectorData, error: sectorError } = await supabase
                .from('sectors')
                .upsert(sectors, { onConflict: 'name_ar' })
                .select('id, name_ar');

            if (sectorError) throw sectorError;

            if (sectorData) {
                sectorData.forEach((s: any) => sectorIdMap.set(s.name_ar, s.id));
                console.log(`✓ Imported ${sectorData.length} sectors`);
            }
        } else if (dryRun) {
            console.log(`🏃 Dry run - would insert ${sectors.length} sectors`);
            console.log('Samples:', sectors.slice(0, 2).map(s => s.name_ar));
        }

        // Insert Areas
        console.log('\n--- Inserting Areas ---');
        const areas: { name_ar: string; sector_id: string }[] = [];

        // Fetch existing sectors if dry run or for linking
        if (dryRun || !sectorIdMap.size) {
            const { data: existingSectors } = await supabase.from('sectors').select('id, name_ar');
            if (existingSectors) {
                existingSectors.forEach((s: any) => sectorIdMap.set(s.name_ar, s.id));
            }
        }

        for (const [sectorName, areasSet] of sectorsMap) {
            const sectorId = sectorIdMap.get(sectorName);
            if (!sectorId) continue;

            for (const areaName of areasSet) {
                areas.push({ name_ar: areaName, sector_id: sectorId });
            }
        }

        if (!dryRun && areas.length > 0) {
            const { error } = await supabase
                .from('areas')
                .upsert(areas, { onConflict: 'name_ar,sector_id' });

            if (error) throw error;
            console.log(`✓ Imported ${areas.length} areas`);
        } else if (dryRun) {
            console.log(`🏃 Dry run - would insert ${areas.length} areas`);
            console.log('Samples:', areas.slice(0, 3).map(a => a.name_ar));
        }

        console.log('\n═══════════════════════════════════════════════');
        console.log(`✓ Complete! Sectors: ${sectors.length}, Areas: ${areas.length}`);
        console.log('═══════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

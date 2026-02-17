
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

// Setup Supabase (Service Role Required for RLS bypass if needed, though we enabled public read for now)
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🚀 Quick Import: Inventory (Spare Parts)');

    const filePath = path.join(process.cwd(), 'data', 'inventory.xlsx');
    if (!fs.existsSync(filePath)) {
        console.error('❌ File not found:', filePath);
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(1) as any[]; // Skip header

    console.log(`Processing ${rows.length} rows from Excel...`);

    let importedCount = 0;
    let skippedCount = 0;

    // Default Unit ID (Piece)
    const { data: unitData } = await supabase.from('unit_types').select('id').eq('name_ar', 'قطعة').single();
    const defaultUnitId = unitData?.id;

    const partsToInsert: any[] = [];

    // Columns:
    // 0: WarehouseId
    // 1: WarehouseName
    // 2: ItemNumber
    // 3: ProductName
    // 4: OnHandQuantity

    for (const row of rows) {
        const itemNumber = row[2] ? String(row[2]).trim() : null;
        const name = row[3] ? String(row[3]).trim() : null;
        // Clean quantity: remove commas, non-numeric
        let qtyRaw = row[4];
        let qty = 0;
        if (typeof qtyRaw === 'number') {
            qty = qtyRaw;
        } else if (typeof qtyRaw === 'string') {
            qty = parseFloat(qtyRaw.replace(/,/g, '')) || 0;
        }

        const isDecimal = qty % 1 !== 0;
        const originalQty = qty;
        qty = Math.round(qty);

        const location = row[1] ? String(row[1]).trim() : 'General Warehouse';
        let description = `Imported from Warehouse: ${location}`;
        if (isDecimal) {
            description += ` (Original Qty: ${originalQty})`;
        }

        if (!name) {
            skippedCount++;
            continue;
        }

        partsToInsert.push({
            name_ar: name,
            part_number: itemNumber,
            quantity: qty,
            location: location,
            unit_id: defaultUnitId,
            min_threshold: 5, // Default
            description: description
        });
    }

    // Batch Insert (to avoid timeouts)
    const batchSize = 100;
    for (let i = 0; i < partsToInsert.length; i += batchSize) {
        const batch = partsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('spare_parts').upsert(batch, { onConflict: undefined }); // No unique constraint on name_ar yet in schema? 
        // Wait, checked schema:
        // CREATE TABLE IF NOT EXISTS public.spare_parts ( ... id BIGINT ... )
        // There is NO unique constraint on name_ar or part_number in COMPREHENSIVE_SETUP.sql!
        // So upsert might duplicate if we run it twice unless we specify ID.
        // But we don't have IDs.
        // Strategy: We will just INSERT. If user runs twice, it duplicates. Ideally we should add a constraint.

        if (error) {
            console.error('Error inserting batch:', error);
        } else {
            importedCount += batch.length;
            process.stdout.write(`\rLoaded ${importedCount} items...`);
        }
    }

    console.log(`\n🎉 Inventory Import Complete!`);
    console.log(`- Imported Items: ${importedCount}`);
    console.log(`- Skipped Rows: ${skippedCount}`);
}

main().catch(console.error);

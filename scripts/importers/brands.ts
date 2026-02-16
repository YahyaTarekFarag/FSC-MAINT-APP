import { createClient } from '@supabase/supabase-js';
import { readExcelFile } from '../utils/excel-reader';
import { cleanArabicText, validateRequired } from '../utils/data-cleaner';
import * as path from 'path';

interface BrandRow {
    'اسم الماركة'?: string;
    'Brand Name'?: string;
    'الماركة'?: string;
    [key: string]: any;
}

export async function importBrands(dryRun = false): Promise<void> {
    console.log('\n📦 Importing Brands...');

    // Create Supabase client here (after env vars are loaded)
    // Use service role key if available (bypasses RLS), fallback to anon key
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

    console.log('🔑 Using key type:', process.env.VITE_SUPABASE_SERVICE_KEY ? 'SERVICE_ROLE (bypasses RLS)' : 'ANON');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const filePath = path.join(__dirname, '../../data/company brands.xlsx');

    try {
        // Read Excel file
        const rows = readExcelFile(filePath) as BrandRow[];
        console.log(`Found ${rows.length} rows in Excel file`);

        // Preview first row to help identify columns
        if (rows.length > 0) {
            console.log('Sample row:', rows[0]);
            console.log('Available columns:', Object.keys(rows[0]));
        }

        const brands: { name_ar: string }[] = [];
        const errors: { row: number; error: string }[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Try to find brand name in various column names
                const brandName = row['البراند'] || row['اسم الماركة'] || row['Brand Name'] || row['الماركة'] || row['اسم'] || row['name'];

                const cleanedName = cleanArabicText(brandName);
                validateRequired(cleanedName, 'Brand Name');

                brands.push({
                    name_ar: cleanedName
                });
            } catch (error) {
                errors.push({
                    row: i + 2, // Excel row (1-indexed + header)
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        console.log(`✓ Processed ${brands.length} valid brands`);

        if (errors.length > 0) {
            console.log(`⚠️  ${errors.length} rows had errors:`);
            errors.forEach(e => console.log(`   Row ${e.row}: ${e.error}`));
        }

        if (!dryRun && brands.length > 0) {
            // Insert into Supabase
            const { data, error } = await supabase
                .from('brands')
                .upsert(brands, { onConflict: 'name_ar' });

            if (error) {
                throw error;
            }

            console.log(`✓ Successfully imported ${brands.length} brands to database`);
        } else if (dryRun) {
            console.log('🏃 Dry run mode - no data was inserted');
            console.log('Sample data to be inserted:', brands.slice(0, 3));
        }

    } catch (error) {
        console.error('❌ Error importing brands:', error);
        throw error;
    }
}

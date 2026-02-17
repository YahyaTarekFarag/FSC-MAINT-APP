import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load env
const envPath = path.join(__dirname, '../frontend/.env.migration');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🚀 Importing Fault Categories from Maintenance Reports...');

    const filePath = path.join(process.cwd(), 'data', 'maintenance reports.xlsx');
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`Loaded ${data.length} rows.`);

    const uniqueCategories = new Set<string>();

    data.forEach((row: any) => {
        const category = row['نوع العطل ؟!'];
        if (category) {
            const cleanCat = String(category).trim();
            if (cleanCat) {
                uniqueCategories.add(cleanCat);
            }
        }
    });

    console.log(`Found ${uniqueCategories.size} unique categories.`);

    let inserted = 0;
    const categoriesArray = Array.from(uniqueCategories);

    for (const catName of categoriesArray) {
        // Check if exists
        const { data: existing } = await supabase
            .from('fault_categories')
            .select('id')
            .eq('name_ar', catName)
            .maybeSingle();

        if (!existing) {
            const { error } = await supabase
                .from('fault_categories')
                .insert({
                    name_ar: catName,
                    icon: 'Activity', // Default icon
                    is_active: true
                });

            if (error) {
                console.error(`Error inserting ${catName}:`, error.message);
            } else {
                inserted++;
                console.log(`✓ Inserted: ${catName}`);
            }
        } else {
            console.log(`- Skipped (Exists): ${catName}`);
        }
    }

    console.log(`\n🎉 Import Complete. Inserted ${inserted} new categories.`);
}

main().catch(console.error);

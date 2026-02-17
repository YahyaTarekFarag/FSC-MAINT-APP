import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('📊 Verifying Data Counts...');
    const tables = ['brands', 'sectors', 'areas', 'branches', 'profiles', 'fault_categories', 'tickets'];

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) console.error(`❌ ${table}: Error ${error.message}`);
        else console.log(`✅ ${table}: ${count} rows`);
    }
}

main();

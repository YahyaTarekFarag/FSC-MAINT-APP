import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env
const envPath = path.join(__dirname, '../frontend/.env.migration');
dotenv.config({ path: envPath });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_SERVICE_KEY!
);

async function main() {
    console.log('🔍 Verifying Database Tables...\n');
    console.log(`📡 Connecting to: ${process.env.VITE_SUPABASE_URL}`);
    console.log(`🔑 key length: ${process.env.VITE_SUPABASE_SERVICE_KEY?.length}`);

    // Check fault_categories
    console.log('1. Checking table: fault_categories');
    const { data: fc, error: fcError } = await supabase.from('fault_categories').select('count').limit(1);

    if (fcError) {
        console.error(`   ❌ Error: ${fcError.message}`);
        console.error(`   Hint: schema cache might be stale or table does not exist.`);
    } else {
        console.log(`   ✓ Table exists. Accessible.`);
    }

    // Check profiles columns
    console.log('\n2. Checking table: profiles (status column)');
    // We try to select the status column. If it doesn't exist, it should throw an error.
    const { data: prof, error: profError } = await supabase.from('profiles').select('status').limit(1);

    if (profError) {
        console.error(`   ❌ Error: ${profError.message}`);
    } else {
        console.log(`   ✓ Column 'status' exists.`);
    }

    // Check spare_parts
    console.log('\n3. Checking table: spare_parts');
    const { data: sp, error: spError } = await supabase.from('spare_parts').select('id').limit(1);

    if (spError) {
        console.error(`   ❌ Error: ${spError.message}`);
    } else {
        console.log(`   ✓ Table exists.`);
    }

}

main();

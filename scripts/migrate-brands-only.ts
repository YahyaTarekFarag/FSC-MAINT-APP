import * as dotenv from 'dotenv';
import * as path from 'path';
import { importBrands } from './importers/brands';

// Load environment variables from frontend/.env.migration (uses service role key)
dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

/**
 * Brands-Only Import Script
 * Imports only brands data which is ready and verified
 * Uses service role key to bypass RLS
 */

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    console.log('═══════════════════════════════════════════════');
    console.log('    Brands Import - استيراد الماركات');
    console.log('    Using Service Role Key - تجاوز RLS');
    console.log('═══════════════════════════════════════════════');

    if (dryRun) {
        console.log('🏃 DRY RUN MODE - No data will be inserted');
    }

    // Verify environment variables
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing Supabase credentials in .env.migration file');
        console.error('   Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY are set');
        console.error('   Current URL:', process.env.VITE_SUPABASE_URL);
        console.error('   Has Service Key:', !!process.env.VITE_SUPABASE_SERVICE_KEY);
        process.exit(1);
    }

    console.log('✓ Environment loaded from .env.migration');
    console.log('✓ Using service role key (bypasses RLS)');

    try {
        await importBrands(dryRun);

        console.log('\n═══════════════════════════════════════════════');
        console.log('✓ Brands import completed successfully!');
        console.log('═══════════════════════════════════════════════');

        if (!dryRun) {
            console.log('\n💡 Next steps:');
            console.log('   1. Fix sectors/areas Excel file structure');
            console.log('   2. Run: npm run migrate:sectors-areas');
            console.log('   3. Then: npm run migrate:branches');
        }

    } catch (error) {
        console.error('\n═══════════════════════════════════════════════');
        console.error('❌ Import failed:');
        console.error(error);
        console.error('═══════════════════════════════════════════════');
        process.exit(1);
    }
}

// Run the import
main();

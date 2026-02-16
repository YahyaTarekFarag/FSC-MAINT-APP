import * as dotenv from 'dotenv';
import * as path from 'path';
import { importSectorsAndAreas } from './importers/sectors-areas';

// Load environment variables from frontend/.env.migration (uses service role key)
dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

/**
 * Sectors and Areas Import Script
 * Uses custom parser for non-standard Excel structure
 */

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    console.log('═══════════════════════════════════════════════');
    console.log('  Sectors & Areas Import - القطاعات والمناطق');
    console.log('    Using Service Role Key - تجاوز RLS');
    console.log('═══════════════════════════════════════════════');

    if (dryRun) {
        console.log('🏃 DRY RUN MODE - No data will be inserted');
    }

    // Verify environment variables
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing Supabase credentials in .env.migration file');
        console.error('   Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY are set');
        process.exit(1);
    }

    console.log('✓ Environment loaded from .env.migration');
    console.log('✓ Using service role key (bypasses RLS)');

    try {
        await importSectorsAndAreas(dryRun);

        console.log('\n💡 Next step:');
        console.log('   Run: npm run migrate:branches');

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

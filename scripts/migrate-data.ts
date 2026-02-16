import * as dotenv from 'dotenv';
import * as path from 'path';
import { importBrands } from './importers/brands';
import { importSectorsAndAreas } from './importers/sectors-areas';
import { importBranches } from './importers/branches';

// Load environment variables from frontend/.env
dotenv.config({ path: path.join(__dirname, '../frontend/.env') });

/**
 * Main Data Migration Script
 * Orchestrates the import of all data from Excel files to Supabase
 */

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const skipConfirm = args.includes('--yes') || args.includes('-y');

    console.log('═══════════════════════════════════════════════');
    console.log('    Data Migration from Excel to Supabase');
    console.log('═══════════════════════════════════════════════');

    if (dryRun) {
        console.log('🏃 DRY RUN MODE - No data will be inserted');
    }

    // Verify environment variables
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
        console.error('❌ Missing Supabase credentials in .env file');
        console.error('   Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
        process.exit(1);
    }

    // Confirmation prompt
    if (!dryRun && !skipConfirm) {
        console.log('\n⚠️  WARNING: This will import data into your Supabase database');
        console.log('   Use --dry-run flag to preview without inserting data');
        console.log('   Use --yes or -y to skip this confirmation');
        console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...\n');

        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    try {
        // Phase 1: Master Data (no dependencies)
        console.log('\n📋 PHASE 1: Master Data Import');
        console.log('───────────────────────────────────────────────');

        await importBrands(dryRun);
        await importSectorsAndAreas(dryRun);

        // Phase 2: Hierarchical Data (has dependencies)
        console.log('\n📋 PHASE 2: Hierarchical Data Import');
        console.log('───────────────────────────────────────────────');

        await importBranches(dryRun);

        // Phase 3: Users (requires manual Auth setup)
        console.log('\n📋 PHASE 3: User Profiles');
        console.log('───────────────────────────────────────────────');
        console.log('⚠️  User profile import requires Auth user creation first');
        console.log('   Please create Auth users via Supabase Dashboard or Edge Function');
        console.log('   Then run: npm run migrate:profiles');

        // Phase 4: Transactional Data
        console.log('\n📋 PHASE 4: Tickets');
        console.log('───────────────────────────────────────────────');
        console.log('ℹ️  Ticket import should be done after profiles are set up');
        console.log('   Run: npm run migrate:tickets');

        console.log('\n═══════════════════════════════════════════════');
        console.log('✓ Migration completed successfully!');
        console.log('═══════════════════════════════════════════════');

        if (dryRun) {
            console.log('\n💡 To actually import data, run without --dry-run flag:');
            console.log('   npm run migrate');
        }

    } catch (error) {
        console.error('\n═══════════════════════════════════════════════');
        console.error('❌ Migration failed:');
        console.error(error);
        console.error('═══════════════════════════════════════════════');
        process.exit(1);
    }
}

// Run the migration
main();

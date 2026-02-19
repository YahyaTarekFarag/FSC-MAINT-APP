import * as dotenv from 'dotenv';
import * as path from 'path';
import { importBrands } from './importers/brands';
import { importSectorsAndAreas } from './importers/sectors-areas';
import { importBranches } from './importers/branches';
import { importProfiles } from './importers/profiles';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

/**
 * Master Data Seeding Script
 * -------------------------
 * This script orchestrates the import of all primary data in order:
 * 1. Brands (No dependencies)
 * 2. Sectors & Areas (No dependencies)
 * 3. Branches (Depends on Brands and Areas)
 * 4. Profiles (Depends on Sectors and Areas)
 */

async function runSeeding() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    console.log('═══════════════════════════════════════════════');
    console.log('🏛️  Sovereign Master Data Seeding');
    console.log('═══════════════════════════════════════════════');

    if (dryRun) {
        console.log('🏃 DRY RUN MODE - NO WRITES TO DB');
    }

    // Verify Environment
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing credentials in .env.migration');
        process.exit(1);
    }

    try {
        // Step 1: Brands
        console.log('\n[1/3] Processing Brands...');
        await importBrands(dryRun);

        // Step 2: Sectors & Areas
        console.log('\n[2/3] Processing Sectors & Areas...');
        await importSectorsAndAreas(dryRun);

        // Step 3: Branches
        console.log('\n[3/4] Processing Branches...');
        await importBranches(dryRun);

        // Step 4: Profiles
        console.log('\n[4/4] Processing Profiles...');
        await importProfiles(dryRun);

        console.log('\n✅ Master Data Seeding Completed Successfully!');

    } catch (error) {
        console.error('\n🛑 Seeding Pipeline Failed:');
        console.error(error);
        process.exit(1);
    }
}

runSeeding();

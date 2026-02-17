import * as dotenv from 'dotenv';
import * as path from 'path';
import { importBranches } from './importers/branches';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

async function main() {
    try {
        await importBranches();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();

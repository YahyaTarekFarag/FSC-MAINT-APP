
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role for migration

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: npx tsx scripts/utils/run-sql.ts <path-to-sql-file>');
        process.exit(1);
    }

    const sqlFilePath = path.join(process.cwd(), args[0]);
    console.log(`Executing SQL from: ${sqlFilePath}`);

    try {
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        // Split by statement if needed, or run as whole block if Postgres client allows.
        // Supabase-js doesn't have a direct "query" method for raw SQL unless via RPC.
        // We will assume there is an RPC function 'exec_sql' or we use psql via command line if available.
        // SINCE WE DON'T HAVE PG CLIENT, WE WILL USE RPC if available, OR WARN USER.

        console.warn('⚠️  This script requires an `exec_sql` RPC function in database to run raw SQL via API.');
        console.warn('   Attempting to run via direct connection string if PG client was installed (it is not).');
        console.log('   Instead, printing instructions:');
        console.log('\n   PLEASE RUN THIS SQL IN SUPABASE DASHBOARD:\n');
        console.log(sql);

    } catch (err) {
        console.error('Error reading file:', err);
    }
}

main();

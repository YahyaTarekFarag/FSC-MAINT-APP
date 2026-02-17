
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listUsers() {
    console.log('--- Listing All Users ---');

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error.message);
        return;
    }

    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
        console.log(`- Email: ${u.email} | ID: ${u.id} | Last Sign In: ${u.last_sign_in_at}`);
    });
}

listUsers();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from frontend/.env
dotenv.config({ path: path.resolve(__dirname, '../../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserRoles() {
    console.log('Checking user roles...');
    const { data, error } = await supabase
        .from('profiles')
        .select('email, role')
        .in('email', ['123@system.com', 'tech@system.com', 'admin@system.com'])
        .limit(10);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('User Roles:', data);
    }
}

checkUserRoles();

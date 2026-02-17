
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
    console.error('Missing credentials');
    process.exit(1);
}

async function debugRLS() {
    console.log('--- Debugging RLS Recursion ---');

    // Auth as Admin
    const client = createClient(supabaseUrl, anonKey);
    const { error: loginError } = await client.auth.signInWithPassword({
        email: 'qa_admin@test.com',
        password: 'password123'
    });
    if (loginError) {
        console.error('Login failed:', loginError.message);
        return;
    }

    console.log('Logged in as Admin. Testing "get_my_role" RPC...');

    // Call RPC
    const { data: role, error: rpcError } = await client.rpc('get_my_role');

    if (rpcError) {
        console.error('❌ RPC "get_my_role" FAILED:', JSON.stringify(rpcError));
    } else {
        console.log('✅ RPC "get_my_role" SUCCEEDED. Result:', role);
    }
}

debugRLS();

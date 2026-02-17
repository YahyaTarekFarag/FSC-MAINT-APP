
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from frontend/.env
dotenv.config({ path: path.resolve(__dirname, '../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Helper to get an authenticated client
async function getAuthClient(email, password) {
    const client = createClient(supabaseUrl, anonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    const { data: { session }, error } = await client.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
    return { client, session };
}

async function runTests() {
    console.log('--- Starting RBAC Verification ---');

    console.log('\n[TEST 1] Testing Admin Access (qa_admin@test.com)...');
    try {
        const { client: adminClient } = await getAuthClient('qa_admin@test.com', 'password123');

        // 0. Debug Identity
        const { data: me, error: meError } = await adminClient.from('profiles').select('*').eq('id', (await adminClient.auth.getUser()).data.user.id).single();
        if (meError) console.error('❌ Admin failed to fetch OWN profile:', JSON.stringify(meError));
        else console.log('✅ Admin can see own profile. Role:', me.role);

        // 1. Fetch Profiles (Should see all)
        const { count: profileCount, error: profileError } = await adminClient
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (profileError) console.error('❌ Admin failed to fetch profiles. Full Error:', JSON.stringify(profileError));
        else console.log(`✅ Admin can access profiles table. Count: ${profileCount}`);

        // 2. Fetch System Config (Should succeed)
        const { error: configError } = await adminClient.from('system_config').select('*').limit(1);
        if (configError) console.error('❌ Admin failed to fetch system_config:', configError.message);
        else console.log('✅ Admin can access system_config.');

    } catch (e) {
        console.error('❌ Admin Test Failed Exception:', e.message);
    }

    console.log('\n[TEST 2] Testing Technician Access (qa_tech@test.com)...');
    try {
        const { client: techClient, session } = await getAuthClient('qa_tech@test.com', 'password123');
        const myId = session.user.id;

        // 1. Fetch All Profiles (Should NOT see all/others)
        const { data: profiles, error: profileError } = await techClient
            .from('profiles')
            .select('id')
            .limit(10);

        if (profileError) {
            console.log('✅ Tech correctly blocked from listing profiles (Error received).');
        } else {
            const others = profiles.filter(p => p.id !== myId);
            if (others.length > 0) {
                console.error(`❌ SECURITY FAILURE: Technician can see ${others.length} other profiles!`);
            } else {
                console.log('✅ Technician can only see their own profile (RLS working).');
            }
        }

        // 2. Fetch System Config (Should FAIL)
        const { data: config, error: configError } = await techClient.from('system_config').select('*');
        if (configError || config.length === 0) {
            console.log('✅ Technician correctly blocked from system_config.');
        } else {
            console.error('❌ SECURITY FAILURE: Technician can read system_config!', config);
        }

        // 3. Fetch Tickets (Should Succeed)
        const { error: ticketError } = await techClient.from('tickets').select('id').limit(1);
        if (ticketError) console.error('❌ Technician failed to fetch tickets:', ticketError.message);
        else console.log('✅ Technician can access tickets.');

    } catch (e) {
        console.error('❌ Tech Test Failed Exception:', e.message);
    }

    console.log('\n--- RBAC Verification Complete ---');
}

runTests();

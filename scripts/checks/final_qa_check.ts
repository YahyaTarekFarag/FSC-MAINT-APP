
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix for ESM/CJS path resolution
const envPath = path.resolve(process.cwd(), 'frontend', '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Fallback
if (!process.env.VITE_SUPABASE_URL) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQACheck() {
    console.log('🧪 Starting Final QA Check...');

    // 1. Verify Auth (Login)
    console.log('\n1️⃣  Testing Authentication...');
    // We can't easily sign in with password purely via admin API without a real user password known.
    // But we can check if the test user exists.
    const testEmail = '123@system.com';

    // Note: We can't see auth.users without service role, but we can check profiles if they are public/tech accessible
    // Or we can try to signIn with the known test credentials "123"

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: '123'
    });

    if (authError) {
        console.error('❌ Login Failed:', authError.message);
        if (authError.message.includes('Invalid login credentials')) {
            console.log('   (Did you create the test users?)');
        }
    } else {
        console.log('✅ Login Successful for:', authData.user.email);
        console.log('   User ID:', authData.user.id);

        // 2. Verify Profile Access
        console.log('\n2️⃣  Testing Profile Access...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            console.error('❌ Failed to fetch profile:', profileError.message);
        } else {
            console.log('✅ Profile Found:', profile.full_name, `(${profile.role})`);

            // 3. Verify System Config Read
            console.log('\n3️⃣  Testing System Config Read...');
            const { data: config, error: configError } = await supabase.from('system_config').select('*').limit(1);
            if (configError) {
                console.error('❌ Failed to read system_config:', configError.message);
            } else {
                console.log('✅ System Config accessible. Rows:', config.length);
            }

            // 4. Verify Ticket Creation (Simulation)
            // We won't actually create junk data, but we'll check if we CAN read ticket categories to populate the form
            console.log('\n4️⃣  Testing Dependency Access (Fault Categories)...');
            const { data: cats, error: catError } = await supabase.from('fault_categories').select('*').limit(1);
            if (catError) {
                console.error('❌ Failed to read fault_categories:', catError.message);
            } else {
                console.log('✅ Fault Categories accessible. Count:', cats.length);
            }
        }
    }
}

runQACheck();

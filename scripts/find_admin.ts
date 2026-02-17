
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🔍 Searching for Admin users...');

    // Check for role = 'admin'
    const { data: admins, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'admin');

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    if (admins && admins.length > 0) {
        console.log(`✅ Found ${admins.length} admins:`);
        for (const admin of admins) {
            const { data: user } = await supabase.auth.admin.getUserById(admin.id);
            console.log(`   - Name: ${admin.full_name}, Email: ${user.user?.email}`);
        }
    } else {
        console.log('⚠️ No users with "admin" role found.');

        // Check for managers
        const { data: managers } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('role', 'manager');

        if (managers && managers.length > 0) {
            console.log(`ℹ️ Found ${managers.length} managers (potential admins):`);
            // List first 5
            for (const m of managers.slice(0, 5)) {
                const { data: u } = await supabase.auth.admin.getUserById(m.id);
                console.log(`   - Name: ${m.full_name}, Email: ${u.user?.email}`);
            }
        }

        // Offer to create one
        console.log('\n💡 Recommendation: Create a default admin user.');
        await createDefaultAdmin();
    }
}

async function createDefaultAdmin() {
    const email = 'admin@blaban.com';
    const password = 'password123';

    console.log(`\n🛠 Creating default admin: ${email}`);

    // 1. Create Auth User
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'System Admin' }
    });

    let userId = user?.user?.id;

    if (createError) {
        console.log(`   Auth note: ${createError.message}`);
        // If already exists, get ID
        if (createError.message.includes('already registered')) {
            const { data: existingUser } = await supabase.from('auth.users').select('id').eq('email', email).maybeSingle();
            // verifying via listUsers as direct select on auth.users might be blocked or need rpc
            const { data } = await supabase.auth.admin.listUsers();
            const found = data.users.find(u => u.email === email);
            if (found) userId = found.id;
        }
    }

    if (userId) {
        // 2. Assign Admin Role in Profiles
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                full_name: 'System Admin',
                role: 'admin',
                status: 'active'
            });

        if (profileError) console.error('   ❌ Error updating profile:', profileError.message);
        else console.log('   ✅ Admin profile configured successfully.');
    }
}

main();

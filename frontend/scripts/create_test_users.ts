import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUsers() {
    console.log('--- Creating Easy-Access Test Users ---');

    const users = [
        {
            email: '123@system.com',
            password: '123',
            fullName: 'Admin User',
            role: 'admin'
        },
        {
            email: '1234@system.com',
            password: '1234',
            fullName: 'Technician User',
            role: 'technician'
        }
    ];

    for (const u of users) {
        console.log(`Creating user: ${u.email}`);

        // Check if user exists first by trying to create
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { full_name: u.fullName }
        });

        let userId = authUser?.user?.id;

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log(`User ${u.email} already exists, updating profile...`);
                const { data: userData } = await supabase.auth.admin.listUsers();
                userId = userData.users.find(user => user.email === u.email)?.id;
            } else {
                console.error(`Error creating ${u.email}:`, authError.message);
                continue;
            }
        }

        if (userId) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: userId,
                full_name: u.fullName,
                role: u.role,
                specialization: u.role === 'admin' ? 'System Admin' : 'General Maintenance'
            });

            if (profileError) {
                console.error(`Error updating profile for ${u.email}:`, profileError.message);
            } else {
                console.log(`Successfully set up ${u.role}: ${u.email} / ${u.password}`);
            }
        }
    }

    console.log('--- Done ---');
}

createTestUsers().catch(err => {
    console.error('Script failed:', err);
});

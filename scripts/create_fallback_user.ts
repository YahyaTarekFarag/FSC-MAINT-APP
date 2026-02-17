
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createFallbackUser() {
    console.log('--- Creating Fallback User (123) ---');

    const email = '123@system.com';
    const password = '123';
    const name = 'System Admin';

    // 1. Check if exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existing = users.find(u => u.email === email);

    let userId = existing?.id;

    if (!existing) {
        console.log(`Creating user ${email}...`);
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: name }
        });

        if (error) {
            console.error('Error creating user:', error.message);
            return;
        }
        userId = data.user.id;
        console.log(`User created. ID: ${userId}`);
    } else {
        console.log('User already exists. Updating password...');
        const { error } = await supabase.auth.admin.updateUserById(userId, { password });
        if (error) console.error('Error updating password:', error.message);
        else console.log('Password reset to 123');
    }

    // 2. Ensure Profile & Role
    if (userId) {
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email,
                full_name: name,
                role: 'admin',
                status: 'active'
            });

        if (profileError) console.error('Error updating profile:', profileError.message);
        else console.log('Profile ensured as Admin.');
    }
}

createFallbackUser();

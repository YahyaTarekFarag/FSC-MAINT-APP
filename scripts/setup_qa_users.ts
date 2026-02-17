
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from frontend/.env
dotenv.config({ path: path.resolve(__dirname, '../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials (URL or Service Role Key)');
    process.exit(1);
}

// Create client with Service Role Key to bypass RLS
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const users = [
    { email: 'qa_admin@test.com', password: 'password123', role: 'admin', name: 'QA Admin' },
    { email: 'qa_tech@test.com', password: 'password123', role: 'technician', name: 'QA Technician' }
];

async function setupUsers() {
    console.log('Starting QA User Setup...');

    for (const user of users) {
        console.log(`Processing ${user.email}...`);

        // Check if user exists
        const { data: { users: existingUsers }, error: listError } = await supabase.auth.admin.listUsers();

        let userId = existingUsers?.find(u => u.email === user.email)?.id;

        if (!userId) {
            console.log(`Creating user ${user.email}...`);
            const { data, error } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: { full_name: user.name }
            });

            if (error) {
                console.error(`Error creating ${user.email}:`, error.message);
                continue;
            }
            userId = data.user.id;
        } else {
            console.log(`User ${user.email} already exists (ID: ${userId})`);
        }

        // Force update profile role
        if (userId) {
            console.log(`Updating role for ${user.email} to '${user.role}'...`);

            // First check if profile exists (triggered by auth hook usually, but let's be safe)
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

            if (!profile) {
                console.log(`Creating profile manually for ${user.email}...`);
                const { error: insertError } = await supabase.from('profiles').insert({
                    id: userId,
                    email: user.email,
                    full_name: user.name,
                    role: user.role,
                    status: 'active'
                });
                if (insertError) console.error(`Error inserting profile:`, insertError);
            } else {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ role: user.role, status: 'active' }) // Ensure active status
                    .eq('id', userId);

                if (updateError) {
                    console.error(`Error updating role for ${user.email}:`, updateError);
                } else {
                    console.log(`Successfully updated ${user.email} to role '${user.role}'`);
                }
            }
        }
    }
    console.log('QA User Setup Complete.');
}

setupUsers();

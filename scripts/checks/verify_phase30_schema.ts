
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from frontend directory
// Load env from frontend directory (assuming we run from project root or frontend)
// We'll try to find .env in frontend/
const envPath = path.resolve(process.cwd(), 'frontend', '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Fallback: try current directory if that fails or if we are already in frontend
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

async function verify() {
    console.log('Verifying Phase 30 Schema...');
    let hasError = false;

    // 1. Check area_tech_assignments table
    const { error: tableError } = await supabase.from('area_tech_assignments').select('id').limit(1);
    if (tableError) {
        if (tableError.code === '42P01') { // undefined_table
            console.error('❌ Table [area_tech_assignments] is MISSING.');
            hasError = true;
        } else {
            console.error('⚠️ Error checking [area_tech_assignments]:', tableError.message);
        }
    } else {
        console.log('✅ Table [area_tech_assignments] exists.');
    }

    // 2. Check profiles.presence_status
    // We can't check columns directly with standard client easily without fetching a row
    // We'll try to select the column
    const { error: colError } = await supabase.from('profiles').select('presence_status').limit(1);
    if (colError) {
        console.error('❌ Column [profiles.presence_status] seems to be MISSING or inaccessible:', colError.message);
        hasError = true;
    } else {
        console.log('✅ Column [profiles.presence_status] exists.');
    }

    // 3. Check closure_form_templates (optional, as we used category_questions)
    const { error: templateError } = await supabase.from('closure_form_templates').select('id').limit(1);
    if (templateError && templateError.code === '42P01') {
        console.log('ℹ️ Table [closure_form_templates] is missing (Not critical if using category_questions).');
    } else if (!templateError) {
        console.log('✅ Table [closure_form_templates] exists.');
    }

    if (hasError) {
        console.log('\nCRITICAL: Database schema is out of sync with Phase 30 code.');
        console.log('Please run database/migrations/phase30_ops_module.sql in your Supabase SQL Editor.');
        process.exit(1);
    } else {
        console.log('\nSchema verified successfully. Phase 30 features should work.');
    }
}

verify();

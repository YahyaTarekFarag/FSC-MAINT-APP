import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testConnection() {
    console.log('--- Testing Supabase Connection ---');
    console.log(`URL: ${supabaseUrl}`);

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        const { data, error } = await supabase.from('brands').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection Error:', error.message);
        } else {
            console.log('Successfully connected to Supabase!');
            console.log('Total brands in DB:', data || 0);
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

testConnection();

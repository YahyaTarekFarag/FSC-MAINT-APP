const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY
);

async function inspect() {
    console.log('🔍 Inspecting Profiles Table...');

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
            console.log('Sample Role:', data[0].role);
        } else {
            console.log('Table is empty.');
        }
    }
}

inspect();

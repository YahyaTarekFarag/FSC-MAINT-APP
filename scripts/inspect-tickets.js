const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY
);

async function inspect() {
    console.log('🔍 Inspecting Spare Parts Table...');

    const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table is empty. Checking schema via empty insert attempt or just assume standard.');
            // schema check via error message often reveals columns if we select non-existent
            const { error: err2 } = await supabase.from('spare_parts').select('non_existent').limit(1);
            if (err2) console.log('Hint:', err2.message || err2.hint);
        }
    }
}

inspect();

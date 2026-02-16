const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY
);

async function inspect() {
    console.log('🔍 Inspecting Branches Table...');

    // Try to select one row to see columns
    const { data, error } = await supabase
        .from('branches')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table is empty. Cannot infer columns from data.');
            // Try to look at error message from invalid select
            const { error: err2 } = await supabase.from('branches').select('non_existent_column');
            console.log('Hint from error:', err2.hint || err2.message);
        }
    }
}

inspect();

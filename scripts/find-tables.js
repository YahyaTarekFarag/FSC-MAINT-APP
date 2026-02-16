const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY
);

async function inspect() {
    console.log('🔍 Listing Tables...');

    const { data, error } = await supabase
        .rpc('get_tables'); // Won't work unless RPC exists

    // Standard way to list tables via SQL if we cant use RPC:
    // We can't run raw SQL easily via client without an RPC or specific endpoint.
    // Try to guess common names

    const candidates = ['repairs', 'repair_logs', 'maintenance_logs', 'repair_documents', 'ticket_updates'];

    for (const table of candidates) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error) {
            console.log(`✓ Found Table: ${table}`);
        }
    }
}

inspect();

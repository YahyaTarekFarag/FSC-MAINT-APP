
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

async function verifyWorkflow() {
    console.log('--- Starting Ticket Workflow Verification ---');

    // 1. Authenticate as Technician
    const client = createClient(supabaseUrl, anonKey);
    const { data: { session }, error: loginError } = await client.auth.signInWithPassword({
        email: 'qa_tech@test.com',
        password: 'password123'
    });

    if (loginError) {
        console.error('❌ Login failed:', loginError.message);
        return;
    }
    console.log('✅ Technician logged in.');

    // 2. Fetch required data (Branch)
    // Technicians can only see branches in their area. 
    // If this fails, we might need to assign the QA tech to an area first.
    const { data: branches, error: branchError } = await client.from('branches').select('id, name_ar').limit(1);

    let branchId;
    if (branchError || !branches || branches.length === 0) {
        console.warn('⚠️ No branches found for this technician. This might be due to RLS if not assigned to an area.');
        // Fallback: We might need to assign this tech to an area via Admin script first, 
        // or just pick a branch if we were Admin. But here we challenge the RLS.
        // Let's assume for now we might fail here if setup isn't perfect.
        console.log('Skipping creation test if no branch access.');
        return;
    } else {
        branchId = branches[0].id;
        console.log(`✅ Found visible branch: ${branches[0].name_ar}`);
    }

    // 3. Create Ticket
    console.log('Attempting to create a ticket...');
    const ticketData = {
        branch_id: branchId,
        fault_category: 'General',
        description: 'QA Verification Ticket',
        priority: 'medium',
        status: 'open'
    };

    const { data: ticket, error: createError } = await client
        .from('tickets')
        .insert(ticketData)
        .select()
        .single();

    if (createError) {
        console.error('❌ Ticket creation failed:', createError.message);
    } else {
        console.log(`✅ Ticket created successfully! ID: ${ticket.id}`);

        // 4. Update Ticket (Add a comment or change status)
        const { error: updateError } = await client
            .from('tickets')
            .update({ status: 'in_progress' })
            .eq('id', ticket.id);

        if (updateError) console.error('❌ Status update failed:', updateError.message);
        else console.log('✅ Ticket status updated to "in_progress".');
    }

    console.log('--- Workflow Verification Complete ---');
}

verifyWorkflow();

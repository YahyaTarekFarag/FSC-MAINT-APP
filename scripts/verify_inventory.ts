
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need this to create dummy parts if needed

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

async function verifyInventory() {
    console.log('--- Starting Inventory Verification ---');

    // 1. Setup: Create a dummy part as Admin (or Service Role)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Check if we have any parts, if not create one
    let { data: part, error: partError } = await adminClient
        .from('spare_parts')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (!part) {
        console.log('Creating dummy part for testing...');
        const { data: newPart, error: createError } = await adminClient
            .from('spare_parts')
            .insert({
                name_ar: 'قطعة اختبار',
                part_number: 'TEST-001',
                quantity: 100,
                price: 50
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Failed to create test part:', createError.message);
            return;
        }
        part = newPart;
    }

    const initialQty = part.quantity;
    console.log(`Initial Stock for '${part.name_ar}': ${initialQty}`);

    // 2. Consume Part as Technician
    const techClient = createClient(supabaseUrl, anonKey);
    await techClient.auth.signInWithPassword({
        email: 'qa_tech@test.com',
        password: 'password123'
    });

    const consumeAmount = 5;
    console.log(`Technician consuming ${consumeAmount} units...`);

    const { error: txError } = await techClient
        .from('inventory_transactions')
        .insert({
            part_id: part.id,
            change_amount: -consumeAmount, // Negative for consumption
            transaction_type: 'consumption',
            user_id: (await techClient.auth.getUser()).data.user.id
        });

    if (txError) {
        console.error('❌ Transaction failed:', txError.message);
        return;
    }
    console.log('✅ Transaction recorded.');

    // 3. Verify Stock Update
    // Fetch part again using Admin client to ensure fresh data
    const { data: updatedPart, error: fetchError } = await adminClient
        .from('spare_parts')
        .select('quantity')
        .eq('id', part.id)
        .single();

    if (fetchError) {
        console.error('❌ Failed to fetch updated part:', fetchError.message);
        return;
    }

    const expectedQty = initialQty - consumeAmount;
    if (updatedPart.quantity === expectedQty) {
        console.log(`✅ Stock verified! New Quantity: ${updatedPart.quantity} (Expected: ${expectedQty})`);
    } else {
        console.error(`❌ Stock Mismatch! New Quantity: ${updatedPart.quantity} (Expected: ${expectedQty})`);
    }

    console.log('--- Inventory Verification Complete ---');
}

verifyInventory();

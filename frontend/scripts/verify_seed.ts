import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verify() {
    const { count: bCount, data: bSample } = await supabase.from('brands').select('*', { count: 'exact' }).limit(1);
    const { count: sCount, data: sSample } = await supabase.from('sectors').select('*', { count: 'exact' }).limit(1);
    const { count: aCount, data: aSample } = await supabase.from('areas').select('*', { count: 'exact' }).limit(1);
    const { count: brCount, data: brSample } = await supabase.from('branches').select('*', { count: 'exact' }).limit(1);
    const { count: pCount, data: pSample } = await supabase.from('profiles').select('*', { count: 'exact' }).limit(1);
    const { data: users } = await supabase.auth.admin.listUsers();

    console.log('--- Database Verification (Sample Check) ---');
    console.log(`Brands: ${bCount} (Sample: ${bSample?.[0]?.name_ar || 'None'})`);
    console.log(`Sectors: ${sCount} (Sample: ${sSample?.[0]?.name_ar || 'None'})`);
    console.log(`Areas: ${aCount} (Sample: ${aSample?.[0]?.name_ar || 'None'})`);
    console.log(`Branches: ${brCount} (Sample: ${brSample?.[0]?.name_ar || 'None'})`);
    console.log(`Profiles: ${pCount} (Sample: ${pSample?.[0]?.full_name || 'None'})`);
    console.log(`Auth Users Count: ${users?.users.length || 0}`);
}
verify();

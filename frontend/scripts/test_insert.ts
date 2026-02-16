import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testInsert() {
    console.log('--- Direct Insert Test ---');

    // 1. Test Brand
    const { data: b, error: be } = await supabase.from('brands').upsert({ name_ar: 'Test Brand ' + Date.now() }).select().single();
    if (be) console.error('Brand Error:', be.message);
    else console.log('Brand Inserted:', b.id);

    // 2. Test Sector/Area
    const { data: s, error: se } = await supabase.from('sectors').upsert({ name_ar: 'Test Sector ' + Date.now() }).select().single();
    const { data: a, error: ae } = await supabase.from('areas').upsert({ sector_id: s.id, name_ar: 'Test Area ' + Date.now() }).select().single();
    if (ae) console.error('Area Error:', ae.message);
    else console.log('Area Inserted:', a.id);

    // 3. Test Branch
    const { data: br, error: bre } = await supabase.from('branches').insert({
        name_ar: 'Test Branch ' + Date.now(),
        area_id: a.id,
        brand_id: b.id
    }).select().single();
    if (bre) console.error('Branch Error:', bre.message);
    else console.log('Branch Inserted:', br.id);
}
testInsert();

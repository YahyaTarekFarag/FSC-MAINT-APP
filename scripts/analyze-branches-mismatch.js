const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY
);

function cleanArabicText(text) {
    if (!text) return '';
    return String(text)
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى$/g, 'ي')
        .replace(/ة$/g, 'ه');
}

async function main() {
    console.log('🔍 Analyzing Branch Mismatches...');

    // 1. Load DB Branches
    const { data: branches } = await supabase.from('branches').select('id, name_ar');
    const dbBranches = new Set();
    branches?.forEach(b => {
        if (b.name_ar) dbBranches.add(cleanArabicText(b.name_ar));
    });
    console.log(`loaded ${dbBranches.size} DB branches`);
    console.log('Sample DB Branches:', Array.from(dbBranches).slice(0, 5));

    // 2. Load Excel Branches
    const filePath = path.join(process.cwd(), 'data', 'maintenance reports.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const excelBranches = new Set();
    rows.forEach(r => {
        const name = r['الفرع ؟! (مرتبة ابجديا أ الى ي )'];
        if (name) excelBranches.add(cleanArabicText(name));
    });

    console.log(`Found ${excelBranches.size} unique branches in Excel`);
    console.log('Sample Excel Branches:', Array.from(excelBranches).slice(0, 5));

    // 3. Compare
    const missing = [];
    const matched = [];

    for (const xlsBranch of excelBranches) {
        if (dbBranches.has(xlsBranch)) {
            matched.push(xlsBranch);
        } else {
            missing.push(xlsBranch);
        }
    }

    console.log(`\n✅ Matched: ${matched.length}`);
    console.log(`❌ Missing/Mismatch: ${missing.length}`);

    console.log('\n--- TOP MISMATCHES ---');
    missing.slice(0, 20).forEach(m => console.log(`"${m}"`));

    console.log('\n--- CLOSE MATCH ATTEMPTS ---');
    // Simple fuzzy check
    missing.slice(0, 10).forEach(m => {
        // Find DB branch that contains this string or vice versa
        const potential = Array.from(dbBranches).find(db => db.includes(m) || m.includes(db));
        if (potential) console.log(`"${m}" might be "${potential}"`);
    });
}

main().catch(console.error);

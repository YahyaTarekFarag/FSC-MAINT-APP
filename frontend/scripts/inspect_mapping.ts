import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as path from 'path';

const dataDir = '../data';
const reportsFile = path.join(dataDir, 'maintenance reports.xlsx');
const workbook = XLSX.readFile(reportsFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('--- Maintenance Reports Sample ---');
console.log('Total Rows:', data.length);
if (data.length > 0) {
    console.log('First Row:', JSON.stringify(data[0], null, 2));
}

// Check unique sectores and branches mapping
const mapping = new Map<string, Set<string>>();
(data as any[]).forEach(row => {
    const sector = row['القطاع ؟!'];
    const branch = row['الفرع ؟! (مرتبة ابجديا أ الى ي )'];
    if (sector && branch) {
        if (!mapping.has(sector)) mapping.set(sector, new Set());
        mapping.get(sector)!.add(branch);
    }
});

console.log('\n--- Sectors and Regions Mapping ---');
mapping.forEach((branches, sector) => {
    console.log(`Sector: ${sector}, Branches: ${branches.size}`);
    console.log(`  Sample Branches: ${Array.from(branches).slice(0, 3).join(', ')}`);
});

const staffFile = path.join(dataDir, 'maintenance team members.xlsx');
const stWB = XLSX.readFile(staffFile);
const stSheet = stWB.Sheets[stWB.SheetNames[0]];
const stData = XLSX.utils.sheet_to_json(stSheet, { header: 1 });
console.log('\n--- Staff File (RAW) ---');
console.log('First 5 rows:', JSON.stringify(stData.slice(0, 5), null, 2));

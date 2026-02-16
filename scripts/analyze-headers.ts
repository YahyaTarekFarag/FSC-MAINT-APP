import { readExcelFile } from './utils/excel-reader.ts';
import * as path from 'path';

const files = [
    'maintenance team members.xlsx',
    'maintenance reports.xlsx',
    'maintenance requests.xlsx',
    'branches names and addresses .xlsx' // Checking this again for Zone dependency
];

console.log('📊 Analyzing Excel Headers...\n');

files.forEach(file => {
    try {
        const filePath = path.join(process.cwd(), 'data', file);
        // readExcelFile returns an array of objects
        const rows = readExcelFile(filePath);

        console.log(`\n📄 File: ${file}`);
        if (rows && rows.length > 0) {
            console.log('   Headers:', Object.keys(rows[0]));
            console.log('   Sample Row:', JSON.stringify(rows[0], null, 2));
            console.log(`   Total Rows: ${rows.length}`);
        } else {
            console.log('   [Empty File or No Data]');
        }
    } catch (e: any) {
        console.log(`   ❌ Error reading ${file}: ${e.message}`);
    }
});

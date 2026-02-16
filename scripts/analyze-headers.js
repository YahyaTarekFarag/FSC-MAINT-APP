const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
    'maintenance team members.xlsx',
    'maintenance reports.xlsx',
    'maintenance requests.xlsx',
    'branches names and addresses .xlsx'
];

console.log('📊 Analyzing Excel Headers (CommonJS)...\n');

files.forEach(file => {
    try {
        const filePath = path.join(process.cwd(), 'data', file);

        if (!fs.existsSync(filePath)) {
            console.log(`\n❌ File not found: ${file}`);
            return;
        }

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`\n📄 File: ${file}`);
        if (data.length > 0) {
            console.log('   Headers:', Object.keys(data[0]));
            console.log('   Sample Row:', JSON.stringify(data[0], null, 2));
            console.log(`   Total Rows: ${data.length}`);
        } else {
            console.log('   [Empty File or No Data]');
        }
    } catch (e) {
        console.log(`   ❌ Error reading ${file}: ${e.message}`);
    }
});

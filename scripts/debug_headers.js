const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
    'company brands.xlsx',
    'branches names and addresses .xlsx',
    'maintenance team members.xlsx'
];

files.forEach(file => {
    try {
        const filePath = path.join(process.cwd(), 'data', file);
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File not found: ${file}`);
            return;
        }
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n📄 File: ${file}`);
        console.log(`   Headers: ${JSON.stringify(data[0])}`);
    } catch (e) {
        console.log(`   ❌ Error reading ${file}: ${e.message}`);
    }
});

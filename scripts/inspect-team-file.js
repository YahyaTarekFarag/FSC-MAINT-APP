const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const teamFile = 'maintenance team members.xlsx';

console.log('🔍 Inspecting Team Members File Structure...\n');

try {
    const filePath = path.join(process.cwd(), 'data', teamFile);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read first 10 rows as arrays
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    data.slice(0, 10).forEach((row, index) => {
        console.log(`Row ${index}:`, JSON.stringify(row));
    });

} catch (e) {
    console.log(`❌ Error: ${e.message}`);
}

console.log('\n📂 Listing Data Directory Files:');
try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = fs.readdirSync(dataDir);
    files.forEach(f => console.log(` - ${f}`));
} catch (e) {
    console.log(`❌ Error listing files: ${e.message}`);
}

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as path from 'path';

const dataDir = '../data';
const branchesFile = path.join(dataDir, 'branches names and addresses .xlsx');
const workbook = XLSX.readFile(branchesFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('--- Branches File Sample ---');
console.log('Total Rows:', data.length);
if (data.length > 0) {
    console.log('First Row:', JSON.stringify(data[0], null, 2));
}

const sectorsFile = path.join(dataDir, 'branches and sectors.xlsx');
const sWorkbook = XLSX.readFile(sectorsFile);
console.log('\n--- Sectors File Sheets ---');
sWorkbook.SheetNames.forEach(name => {
    const sData = XLSX.utils.sheet_to_json(sWorkbook.Sheets[name]);
    console.log(`Sheet: ${name}, Rows: ${sData.length}`);
    if (sData.length > 0) {
        console.log('First Row Keys:', Object.keys(sData[0]));
        console.log('First Row:', JSON.stringify(sData[0], null, 2));
    }
});


import * as XLSX from 'xlsx';
import * as path from 'path';

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: npx tsx headers.ts <file>');
    process.exit(1);
}

const filePath = path.resolve(process.cwd(), args[0]);
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];

console.log(`File: ${args[0]}`);
console.log(`Headers:`, headers);

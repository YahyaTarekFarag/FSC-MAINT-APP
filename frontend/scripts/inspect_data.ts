import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as fs from 'fs';
import * as path from 'path';

const dataDir = '../data';

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx'));

console.log('--- Inspecting Excel Files ---');

files.forEach(file => {
    const filePath = path.join(dataDir, file);
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        console.log(`\nFile: ${file}`);
        if (rows.length > 0) {
            console.log(`Headers: ${rows[0].join(' | ')}`);
        } else {
            console.log('Empty file or no headers found.');
        }
    } catch (error) {
        console.error(`Error reading ${file}:`, error);
    }
});

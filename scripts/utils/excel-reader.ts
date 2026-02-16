import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Excel Reader Utility for Data Migration
 * Provides functions to read and parse Excel files safely
 */

export interface ExcelRow {
    [key: string]: string | number | boolean | null | undefined;
}

export interface ReadExcelOptions {
    sheetName?: string;
    sheetIndex?: number;
    skipRows?: number;
    headerRow?: number;
}

/**
 * Read an Excel file and return rows as an array of objects
 */
export function readExcelFile(
    filePath: string,
    options: ReadExcelOptions = {}
): ExcelRow[] {
    const {
        sheetName,
        sheetIndex = 0,
        skipRows = 0,
        headerRow = 0
    } = options;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    // Read the file
    const workbook = XLSX.readFile(filePath);

    // Get the sheet
    let sheet: XLSX.WorkSheet;
    if (sheetName) {
        sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            throw new Error(`Sheet "${sheetName}" not found in ${path.basename(filePath)}`);
        }
    } else {
        const sheetNames = workbook.SheetNames;
        if (sheetIndex >= sheetNames.length) {
            throw new Error(`Sheet index ${sheetIndex} out of bounds in ${path.basename(filePath)}`);
        }
        sheet = workbook.Sheets[sheetNames[sheetIndex]];
    }

    // Convert to JSON
    const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(sheet, {
        header: headerRow,
        defval: null,
        blankrows: false
    });

    // Skip rows if needed
    if (skipRows > 0) {
        return jsonData.slice(skipRows);
    }

    return jsonData;
}

/**
 * Get all sheet names from an Excel file
 */
export function getSheetNames(filePath: string): string[] {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    return workbook.SheetNames;
}

/**
 * Read a specific cell from an Excel file
 */
export function readCell(
    filePath: string,
    sheetName: string,
    cellAddress: string
): string | number | boolean | null {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
    }

    const cell = sheet[cellAddress];
    return cell ? cell.v : null;
}

/**
 * Count rows in a sheet (excluding header)
 */
export function countRows(filePath: string, sheetIndex = 0): number {
    const data = readExcelFile(filePath, { sheetIndex });
    return data.length;
}

/**
 * Preview first N rows of an Excel file
 */
export function previewFile(
    filePath: string,
    rows = 5,
    sheetIndex = 0
): ExcelRow[] {
    const data = readExcelFile(filePath, { sheetIndex });
    return data.slice(0, rows);
}

/**
 * Export helper: Convert objects array to Excel file
 */
export function writeExcelFile(
    data: ExcelRow[],
    outputPath: string,
    sheetName = 'Sheet1'
): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, outputPath);
}

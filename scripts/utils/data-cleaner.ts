/**
 * Data Cleaning and Normalization Utilities
 * Handles Arabic text, phone numbers, and general data cleanup
 */

/**
 * Clean Arabic text: trim, normalize spaces, remove extra characters
 */
export function cleanArabicText(text: string | null | undefined): string {
    if (!text) return '';

    return text
        .toString()
        .trim()
        // Remove extra spaces
        .replace(/\s+/g, ' ')
        // Remove zero-width characters
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        // Normalize Arabic characters
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه');
}

/**
 * Clean phone number: remove spaces, dashes, parentheses
 */
export function cleanPhoneNumber(phone: string | null | undefined): string | null {
    if (!phone) return null;

    const cleaned = phone
        .toString()
        .replace(/[\s\-\(\)]/g, '');

    // Basic validation: should be digits and possibly start with +
    if (!/^\+?\d+$/.test(cleaned)) {
        return null;
    }

    return cleaned;
}

/**
 * Normalize email address
 */
export function cleanEmail(email: string | null | undefined): string | null {
    if (!email) return null;

    const cleaned = email.toString().trim().toLowerCase();

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        return null;
    }

    return cleaned;
}

/**
 * Generate a safe slug from Arabic text
 */
export function generateSlug(text: string): string {
    return cleanArabicText(text)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-\u0600-\u06FF]/g, '');
}

/**
 * Parse a number from various formats
 */
export function parseNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;

    const num = typeof value === 'number' ? value : parseFloat(value.toString().replace(/,/g, ''));

    return isNaN(num) ? null : num;
}

/**
 * Parse a date from various formats
 */
export function parseDate(value: string | number | Date | null | undefined): Date | null {
    if (!value) return null;

    try {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
}

/**
 * Convert Excel serial date to JavaScript Date
 */
export function excelDateToJSDate(serial: number): Date {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

/**
 * Check if a value is empty/null/undefined
 */
export function isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '' ||
        (typeof value === 'string' && value.trim() === '');
}

/**
 * Safe string conversion
 */
export function toString(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

/**
 * Extract first and last name from Arabic full name
 */
export function parseArabicName(fullName: string): { firstName: string; lastName: string } {
    const parts = cleanArabicText(fullName).split(' ').filter(p => p.length > 0);

    if (parts.length === 0) {
        return { firstName: '', lastName: '' };
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }

    // First part is first name, rest is last name
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
    };
}

/**
 * Validate required field
 */
export function validateRequired(value: any, fieldName: string): string {
    if (isEmpty(value)) {
        throw new Error(`${fieldName} is required`);
    }
    return toString(value);
}

/**
 * Create a unique identifier from text
 */
export function createUniqueKey(...parts: string[]): string {
    return parts
        .map(p => cleanArabicText(p).toLowerCase())
        .filter(p => p.length > 0)
        .join('_');
}

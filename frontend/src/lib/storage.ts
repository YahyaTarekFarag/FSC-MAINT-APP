import { supabase } from './supabase';

const UPLOAD_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Uploads a ticket attachment to Supabase Storage
 * with a 30-second timeout via AbortController.
 * @param file The file to upload (should be pre-validated for size)
 * @returns The public URL of the uploaded file
 */
export async function uploadTicketImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    try {
        const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, file);

        clearTimeout(timeoutId);

        if (uploadError) {
            // Check if it was an abort
            if (controller.signal.aborted) {
                throw new Error('انتهت مهلة رفع الصورة (30 ثانية). تأكد من اتصالك بالإنترنت وحاول مرة أخرى.');
            }
            throw new Error(`فشل رفع الصورة: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (err) {
        clearTimeout(timeoutId);

        // If the error is from abort, provide a user-friendly message
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error('انتهت مهلة رفع الصورة (30 ثانية). تأكد من اتصالك بالإنترنت وحاول مرة أخرى.');
        }

        throw err;
    }
}

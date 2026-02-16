import { supabase } from './supabase';

/**
 * Uploads a ticket attachment to Supabase Storage
 * @param file The file to upload
 * @returns The public URL of the uploaded file
 */
export async function uploadTicketImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);

    if (uploadError) {
        throw new Error(`فشل رفع الصورة: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(filePath);

    return publicUrl;
}

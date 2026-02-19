import { supabase } from '../lib/supabase';

export interface NotificationTemplate {
    key: string;
    template_ar: string;
    is_active: boolean;
}

const FALLBACK_TEMPLATES: Record<string, string> = {
    'new_ticket': "مرحباً {{name}}، تم فتح بلاغ جديد برقم {{ticket_id}} في فرع {{branch}}. العطل: {{issue}}.",
    'ticket_assigned': "مرحباً {{name}}، تم إسناد المهمة رقم {{ticket_id}} لك في فرع {{branch}}. العطل: {{issue}}.",
    'ticket_rejected': "مرحباً {{name}}، تم رفض المهمة رقم {{ticket_id}} في فرع {{branch}}. السبب: {{reason}}."
};

/**
 * Formats a phone number to international code (+20 for Egypt)
 */
export function formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    // If it starts with 0, remove it (e.g., 010 -> 10)
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    // If it doesn't already have 20 prefix, add it
    if (!cleaned.startsWith('20')) {
        cleaned = '20' + cleaned;
    }

    return '+' + cleaned;
}

export class NotificationEngine {
    private static cache: Record<string, string> = { ...FALLBACK_TEMPLATES };

    /**
     * Fetches templates from DB and updates cache
     */
    static async syncTemplates() {
        try {
            const { data, error } = await supabase
                .from('notification_templates')
                .select('key, template_ar')
                .eq('is_active', true);

            if (error) throw error;

            if (data) {
                (data as { key: string; template_ar: string }[]).forEach(item => {
                    this.cache[item.key] = item.template_ar;
                });
            }
        } catch (err) {
            console.error('[NotificationEngine]: Failed to sync templates, using cache/fallbacks', err);
        }
    }

    /**
     * Generates a final message string from a template key and data object
     */
    static async generateMessage(templateKey: string, data: Record<string, any>): Promise<string> {
        // Try to sync if cache is just fallbacks (optional optimization)
        // For simplicity, we assume sync happens elsewhere or we just use cache

        let template = this.cache[templateKey] || FALLBACK_TEMPLATES[templateKey];

        if (!template) {
            // Last resort: fetch directly if not in cache
            const { data: dbData } = await supabase
                .from('notification_templates')
                .select('template_ar')
                .eq('key', templateKey)
                .single() as { data: { template_ar: string } | null };

            if (dbData?.template_ar) {
                template = dbData.template_ar;
                this.cache[templateKey] = template;
            } else {
                return ''; // No template found
            }
        }

        // Replace placeholders {{key}}
        let message = template;
        Object.keys(data).forEach(key => {
            const placeholder = `{{${key}}}`;
            message = message.split(placeholder).join(String(data[key] || ''));
        });

        return message;
    }

    /**
     * Prepares a WhatsApp URL
     */
    static async getWhatsAppUrl(phone: string, templateKey: string, data: Record<string, any>): Promise<string> {
        const message = await this.generateMessage(templateKey, data);
        const formattedPhone = formatPhoneNumber(phone);
        const encodedMessage = encodeURIComponent(message);

        return `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;
    }

    /**
     * Opens WhatsApp in a new tab
     */
    static async openWhatsApp(phone: string, templateKey: string, data: Record<string, any>) {
        const url = await this.getWhatsAppUrl(phone, templateKey, data);
        if (url) {
            window.open(url, '_blank');
        }
    }
}

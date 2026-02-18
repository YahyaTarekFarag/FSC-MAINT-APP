import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type FormFieldConfig = {
    id: string;
    form_id: string;
    field_key: string;
    label_ar: string;
    label_en: string | null;
    is_visible: boolean;
    is_required: boolean;
    field_type: string;
    sort_order: number;
    options: any;
};

export const useFormConfig = (formId: string) => {
    const [fields, setFields] = useState<FormFieldConfig[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data, error } = await supabase
                    .from('form_field_configs')
                    .select('*')
                    .eq('form_id', formId)
                    .order('sort_order', { ascending: true });

                if (error) throw error;
                setFields(data || []);
            } catch (error) {
                console.error(`Error fetching config for ${formId}:`, error);
                // Fallback or empty on error
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, [formId]);

    const getField = (key: string) => fields.find(f => f.field_key === key);

    // Helper to check if a field should be shown
    const shouldShow = (key: string) => {
        const field = getField(key);
        // If config exists, respect it. If not, default to true (safe fallback for legacy/hardcoded fields until fully migrated)
        return field ? field.is_visible : true;
    };

    const getLabel = (key: string, defaultLabel: string) => {
        const field = getField(key);
        return field ? field.label_ar : defaultLabel;
    };

    const isRequired = (key: string, defaultRequired: boolean) => {
        const field = getField(key);
        return field ? field.is_required : defaultRequired;
    };

    return { fields, loading, getField, shouldShow, getLabel, isRequired };
};

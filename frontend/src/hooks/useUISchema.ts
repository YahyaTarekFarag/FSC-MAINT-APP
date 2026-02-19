import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface UISchema {
    title: string;
    description?: string;
    steps: {
        id: string;
        label: string;
        fields: {
            id: string;
            label: string;
            type: 'text' | 'number' | 'select' | 'file' | 'coords' | 'textarea';
            required?: boolean;
            options?: { label: string; value: any; parentId?: any }[];
            filterBy?: string;
            dataSource?: string;
            placeholder?: string;
            multiple?: boolean;
            accept?: string;
        }[];
    }[];
    list_config?: {
        columns: {
            key: string;
            label: string;
            type: 'text' | 'date' | 'badge' | 'avatar';
            colors?: Record<string, string>;
        }[];
        actions: {
            id: string;
            label: string;
            icon: string;
            color: string;
        }[];
    };
    widgets?: {
        id: string;
        type: 'kpi_card' | 'bar_chart' | 'pie_chart';
        title: string;
        view?: string;
        column?: string;
        agg?: string;
        format?: 'currency' | 'number' | 'percent';
        xKey?: string;
        yKey?: string;
        groupKey?: string;
        countKey?: string;
        color?: string;
        icon?: string;
    }[];
}

export function useUISchema(formKey: string) {
    const [schema, setSchema] = useState<UISchema | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        async function fetchSchema() {
            try {
                const { data, error } = await supabase
                    .from('ui_schemas')
                    .select('schema_definition')
                    .eq('form_key', formKey)
                    .eq('is_active', true)
                    .single();

                if (error) throw error;
                setSchema(data.schema_definition as unknown as UISchema);
            } catch (err) {
                console.error('Error fetching UI schema:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        }

        fetchSchema();
    }, [formKey]);

    return { schema, loading, error };
}

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSovereignRegistry } from '../contexts/SovereignRegistryContext';

export interface UISchema {
    title: string;
    description?: string;
    list_config: {
        allowAdd?: boolean;
        columns: {
            key: string;
            label: string;
            type: 'text' | 'date' | 'badge' | 'avatar' | 'boolean';
            colors?: Record<string, string>;
        }[];
        actions: {
            id: string;
            label: string;
            icon: string;
            color: string;
        }[];
    };
    form_config: {
        fields: {
            id: string;
            label: string;
            type: 'text' | 'number' | 'select' | 'file' | 'coords' | 'textarea' | 'checkbox' | 'photo';
            required?: boolean;
            options?: string[] | { label: string; value: any }[];
            dataSource?: string;
            placeholder?: string;
        }[];
    };
    steps?: {
        id: string;
        label: string;
        fields: any[];
    }[];
    widgets?: any[];
}

export function useSovereignSchema(schemaKey: string) {
    const { schemas, getSchema } = useSovereignRegistry();
    const [schema, setSchema] = useState<UISchema | null>(schemas[schemaKey] || null);
    const [loading, setLoading] = useState(!schemas[schemaKey]);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (schemas[schemaKey]) {
            setSchema(schemas[schemaKey]);
            setLoading(false);
            return;
        }

        async function fetchSchema() {
            setLoading(true);
            try {
                const data = await getSchema(schemaKey);
                setSchema(data);
                setError(null);
            } catch (err: any) {
                console.error(`[Sovereign]: Error fetching schema ${schemaKey}`, err);
                setError(err);
                toast.error('فشل في تحميل إعدادات الواجهة السيادية');
            } finally {
                setLoading(false);
            }
        }

        fetchSchema();
    }, [schemaKey, getSchema, schemas]);

    return { schema, loading, error };
}

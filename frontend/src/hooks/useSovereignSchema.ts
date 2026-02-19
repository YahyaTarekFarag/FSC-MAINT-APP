import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SovereignColumn {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'badge' | 'link';
    colors?: Record<string, string>;
}

export interface SovereignAction {
    id: string;
    label: string;
    icon?: string;
}

export interface SovereignSchema {
    id: string;
    schema_key: string;
    list_config: {
        columns: SovereignColumn[];
        actions: SovereignAction[];
        allowAdd?: boolean;
        allowDelete?: boolean;
    };
    form_config?: any;
}

export const useSovereignSchema = (schemaKey: string) => {
    const [schema, setSchema] = useState<SovereignSchema | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchSchema = async () => {
            if (!schemaKey) return;

            setLoading(true);
            try {
                const { data, error: dbError } = await supabase
                    .from('ui_schemas')
                    .select('*')
                    .eq('schema_key', schemaKey)
                    .single();

                if (dbError) throw dbError;
                setSchema(data);
            } catch (err) {
                console.error(`[Sovereign Schema Error] ${schemaKey}:`, err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchSchema();
    }, [schemaKey]);

    return { schema, loading, error };
};

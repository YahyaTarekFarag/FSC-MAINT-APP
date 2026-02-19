import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { UISchema } from '../hooks/useSovereignSchema';

interface SovereignRegistryType {
    schemas: Record<string, UISchema>;
    getSchema: (schemaKey: string) => Promise<UISchema | null>;
    loading: Record<string, boolean>;
}

const SovereignRegistryContext = createContext<SovereignRegistryType | undefined>(undefined);

export const SovereignRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [schemas, setSchemas] = useState<Record<string, UISchema>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const schemaCache = useRef<Record<string, UISchema>>({});
    const promiseCache = useRef<Record<string, Promise<UISchema | null>>>({});

    const getSchema = useCallback((schemaKey: string): Promise<UISchema | null> => {
        // 1. Check synchronous cache
        if (schemaCache.current[schemaKey]) {
            return Promise.resolve(schemaCache.current[schemaKey]);
        }

        // 2. Check in-flight cache (Promise Deduplication)
        if (schemaKey in promiseCache.current) {
            return promiseCache.current[schemaKey];
        }

        // 3. Initiate fetch and cache the promise
        const fetchPromise = (async () => {
            setLoading(prev => ({ ...prev, [schemaKey]: true }));
            try {
                const { data, error } = await (supabase.from('ui_schemas') as any)
                    .select('*')
                    .eq('schema_key', schemaKey)
                    .maybeSingle();

                if (error) throw error;
                if (!data) return null;

                // Support both legacy schema_definition and split columns (list_config, form_config)
                let schema: UISchema;
                if ((data as any).schema_definition) {
                    schema = (data as any).schema_definition as UISchema;
                } else {
                    schema = {
                        title: (data as any).form_config?.title || (data as any).schema_key || 'جدول البيانات',
                        list_config: (data as any).list_config || { columns: [], actions: [] },
                        form_config: (data as any).form_config || { fields: [] }
                    };
                }

                // Update refs and trigger state
                schemaCache.current[schemaKey] = schema;
                setSchemas(prev => ({ ...prev, [schemaKey]: schema }));
                return schema;
            } catch (err) {
                console.error(`[Registry]: Failed to fetch schema ${schemaKey}`, err);
                return null;
            } finally {
                setLoading(prev => ({ ...prev, [schemaKey]: false }));
                // Cleanup in-flight promise tracker
                delete promiseCache.current[schemaKey];
            }
        })();

        promiseCache.current[schemaKey] = fetchPromise;
        return fetchPromise;
    }, []);

    return (
        <SovereignRegistryContext.Provider value={{ schemas, getSchema, loading }}>
            {children}
        </SovereignRegistryContext.Provider>
    );
};

export const useSovereignRegistry = () => {
    const context = useContext(SovereignRegistryContext);
    if (!context) throw new Error('useSovereignRegistry must be used within SovereignRegistryProvider');
    return context;
};

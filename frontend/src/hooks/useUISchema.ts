import { useState, useEffect } from 'react';
import { useSovereignRegistry } from '../contexts/SovereignRegistryContext';
import type { UISchema } from './useSovereignSchema';

// UISchema definition moved to useSovereignSchema.ts for unification

export function useUISchema(formKey: string) {
    const { schemas, getSchema } = useSovereignRegistry();
    const [schema, setSchema] = useState<UISchema | null>(schemas[formKey] || null);
    const [loading, setLoading] = useState(!schemas[formKey]);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (schemas[formKey]) {
            setSchema(schemas[formKey]);
            setLoading(false);
            return;
        }

        async function fetchSchema() {
            setLoading(true);
            try {
                const data = await getSchema(formKey);
                setSchema(data);
                setError(null);
            } catch (err) {
                console.error(`[Sovereign Debug]: Fatal error in useUISchema for ${formKey}`, err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        }

        fetchSchema();
    }, [formKey, getSchema, schemas]);

    return { schema, loading, error };
}


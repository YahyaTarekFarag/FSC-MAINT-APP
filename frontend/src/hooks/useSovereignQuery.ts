import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface QueryOptions {
    table: string;
    select?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
    showArchived?: boolean;
    search?: string;
    searchColumns?: string[];
}

export function useSovereignQuery<T = any>({
    table,
    select = '*',
    filters = {},
    orderBy = { column: 'created_at', ascending: false },
    limit,
    offset,
    showArchived = false,
    search,
    searchColumns = []
}: QueryOptions) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const filtersStr = JSON.stringify(filters);
    const searchColsStr = JSON.stringify(searchColumns);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase.from(table).select(select);

            // 1. Soft Delete Filter
            if (!showArchived) {
                query = query.eq('is_active', true);
            }

            // 2. Global Search (Multi-column)
            if (search && searchColumns.length > 0) {
                const searchString = searchColumns
                    .map(col => `${col}.ilike.%${search}%`)
                    .join(',');
                query = query.or(searchString);
            }

            // 3. Dynamic Filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    query = query.eq(key, value);
                }
            });

            // 4. Ordering
            if (orderBy.column) {
                query = query.order(orderBy.column, { ascending: orderBy.ascending });
            }

            // 5. Pagination
            if (limit) query = query.limit(limit);
            if (offset) query = query.range(offset, offset + (limit || 10) - 1);

            const { data: result, error: queryError } = await query;

            if (queryError) throw queryError;
            setData(result || []);
            setError(null);
        } catch (err: any) {
            console.error(`[useSovereignQuery Error]:`, err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [table, select, filtersStr, orderBy.column, orderBy.ascending, limit, offset, showArchived, search, searchColsStr]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}


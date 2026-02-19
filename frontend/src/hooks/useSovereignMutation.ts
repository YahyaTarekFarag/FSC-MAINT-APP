import { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface MutationOptions {
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
    table_name: string;
}

export const useSovereignMutation = ({ table_name, onSuccess, onError }: MutationOptions) => {
    const [loading, setLoading] = useState(false);

    const createRecord = async (payload: any) => {
        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from(table_name as any)
                .insert(payload as any) as any)
                .select()
                .single();

            if (error) throw error;

            toast.success('تمت الإضافة بنجاح ✨');
            onSuccess?.(data);
            return { data, error: null };
        } catch (err: any) {
            toast.error(`فشلت الإضافة: ${err.message}`);
            onError?.(err);
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    };

    const updateRecord = async (id: string, payload: any) => {
        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from(table_name as any)
                .update(payload as any) as any)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            toast.success('تم التحديث بنجاح 💾');
            onSuccess?.(data);
            return { data, error: null };
        } catch (err: any) {
            toast.error(`فشل التحديث: ${err.message}`);
            onError?.(err);
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    };

    const softDeleteRecord = async (id: string) => {
        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from(table_name as any)
                .update({ is_active: false } as any) as any)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            toast.success('تم الحذف بنجاح 🗑️');
            onSuccess?.(data);
            return { data, error: null };
        } catch (err: any) {
            toast.error(`فشل الحذف: ${err.message}`);
            onError?.(err);
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    };

    const restoreRecord = async (id: string) => {
        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from(table_name as any)
                .update({ is_active: true } as any) as any)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            toast.success('تم استعادة السجل بنجاح 🔄');
            onSuccess?.(data);
            return { data, error: null };
        } catch (err: any) {
            toast.error(`فشلت الاستعادة: ${err.message}`);
            onError?.(err);
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    };

    return { createRecord, updateRecord, softDeleteRecord, restoreRecord, loading };
};




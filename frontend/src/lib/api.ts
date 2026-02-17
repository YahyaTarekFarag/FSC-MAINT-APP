import { supabase } from './supabase';
import type { Json } from './supabase';

interface CreateUserParams {
    email: string;
    password?: string;
    full_name: string;
    role: 'admin' | 'manager' | 'technician';
    branch_id?: string;
    phone?: string;
}

export const adminCreateUser = async (userData: CreateUserParams) => {
    try {
        const { data, error } = await supabase.functions.invoke('create-user', {
            body: userData
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error: unknown) {
        console.error('API Error:', error);
        const message = error instanceof Error ? error.message : 'Error creating user';
        return { data: null, error: message };
    }
};

interface UpdateUserParams {
    targetUserId: string;
    password?: string;
    email?: string;
    user_metadata?: Record<string, unknown>; // Changed from any to unknown
}

export const adminUpdateUser = async (params: UpdateUserParams) => {
    try {
        const { targetUserId, ...updates } = params;
        const { data, error } = await supabase.functions.invoke('admin-update-user', {
            body: {
                targetUserId,
                updates
            }
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error: unknown) {
        console.error('API Error:', error);
        const message = error instanceof Error ? error.message : 'Error updating user';
        return { data: null, error: message };
    }
};

export const logActivity = async (
    action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER',
    entity_name: string,
    details: Record<string, unknown>
) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await supabase.from('system_logs').insert([{
                user_id: session.user.id,
                action_type,
                entity_name,
                details: details as unknown as Json
            }]);
        }
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

export const adminDeleteUser = async (targetUserId: string) => {
    try {
        const { data, error } = await supabase.functions.invoke('admin-delete-user', {
            body: { targetUserId }
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error: unknown) {
        console.error('API Error:', error);
        const message = error instanceof Error ? error.message : 'Error deleting user';
        return { data: null, error: message };
    }
};

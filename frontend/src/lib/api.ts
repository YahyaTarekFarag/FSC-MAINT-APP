import { supabase } from './supabase';

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
                details
            }]);
        }
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

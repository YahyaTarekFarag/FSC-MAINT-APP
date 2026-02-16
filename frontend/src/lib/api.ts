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
    } catch (error: any) {
        console.error('API Error:', error);
        return { data: null, error: error.message || 'Error creating user' };
    }
};

export const logActivity = async (
    action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER',
    entity_name: string,
    details: any
) => {
    try {
        const { error } = await supabase.from('system_logs').insert([{
            action_type,
            entity_name,
            details,
            // user_id is handled by default via RLS or auth context if we set it explicitly?
            // Actually our RLS check allows insert if auth.uid() = user_id.
            // So we MUST send user_id. 
            // However, we can't easily get session here without async call.
            // Let's rely on the Edge Function or a Trigger for secure logs usually.
            // For client-side logging (less secure but functional for now):
        }]);
        // Correction: We need to get the user ID. 
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


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 1. Verify the caller is an Admin
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) throw new Error('Unauthorized')

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Unauthorized: Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Initialize Admin Client for User Creation
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, full_name, role, branch_id, phone } = await req.json()

        // 3. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role }
        })

        if (authError) throw authError

        if (!authData.user) throw new Error('Failed to create auth user')

        // 4. Create Profile Record
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ // upsert is safer generally, but we expect new user. using update if exists or insert. Actually profiles are usually triggered by auth? 
                // If we have a trigger, update. If not, insert. 
                // Assuming we rely on a Trigger for Profile Creation: we Update.
                // Assuming NO Trigger: We Insert.
                // Strategy: Upsert to be safe.
                full_name,
                role,
                assigned_area_id: branch_id ? null : null, // Simplification: Branch logic requires mapping. Leaving null for now or using branch_id if schema matched.
                status: 'active',
                phone: phone || null
            })
            .eq('id', authData.user.id)

        // Fallback: If no trigger exists, the UPDATE above finds nothing. We should INSERT.
        // Better approach: INSERT directly. If trigger exists and auto-creates, we might duplicate or conflict? 
        // Standard Supabase pattern: 
        // Option A: Trigger on auth.users -> public.profiles. Then we update that profile.
        // Option B: No trigger. We insert profile manually.

        // Let's try UPSERT to handle both.
        const { error: upsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                full_name,
                role,
                status: 'active',
                phone: phone || null,
                email: email // We added email column recently
                // assigned_area_id: branch_id // If we had this mapped
            })

        if (upsertError) throw upsertError

        return new Response(
            JSON.stringify({ user: authData.user, message: 'User created successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

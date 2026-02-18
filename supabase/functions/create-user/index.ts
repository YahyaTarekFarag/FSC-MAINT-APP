import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 1. Authenticate Request (Check if user is admin)
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) throw new Error('Not authenticated')

        // Fetch profile to verify role
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError || profile?.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Unauthorized: Admins only' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Use Service Role to Create User
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, full_name, role, branch_id, phone } = await req.json()

        if (!email || !password) {
            throw new Error('Email and password are required')
        }

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto confirm since created by admin
            user_metadata: {
                full_name,
                role, // Add directly to metadata
            }
        })

        if (createError) throw createError
        if (!newUser.user) throw new Error('User creation failed')

        // 3. Create Profile Entry (if trigger doesn't handle it, or to update extra fields)
        // Usually a trigger handles basic profile creation on auth.users insert.
        // We will update the profile with specific role/branch info to be sure.

        // Wait a tiny bit for trigger? Or just upsert.
        // Better to upsert to ensure data integrity.
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUser.user.id,
                email: email,
                full_name: full_name,
                role: role || 'technician',
                branch_id: branch_id || null, // Optional
                phone: phone || null,
                status: 'active',
                created_at: new Date().toISOString()
            })

        if (profileUpdateError) {
            // Rollback user creation if profile fails? 
            // Ideally yes, but for now just report error.
            throw new Error(`Profile creation failed: ${profileUpdateError.message}`)
        }

        return new Response(
            JSON.stringify(newUser),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

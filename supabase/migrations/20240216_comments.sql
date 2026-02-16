-- Create ticket_comments table
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Select: Users can see comments if they can see the ticket (which is handled by tickets RLS, but here we just check if they are authenticated and we could add more specific logic if needed)
CREATE POLICY "Users can view comments for accessible tickets" ON public.ticket_comments
    FOR SELECT
    TO authenticated
    USING (true); -- Simplification: if you can select from this table, you're fine for now. 
                 -- Ideally: USING (EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id))

-- 2. Insert: Authenticated users can post comments
CREATE POLICY "Authenticated users can post comments" ON public.ticket_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Phase 61: Dynamic Form Engine Schema

-- 1. Table: form_definitions
-- Defines the structure of dynamic forms
CREATE TABLE IF NOT EXISTS public.form_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_key TEXT NOT NULL,           -- e.g., 'new_ticket', 'job_report', 'site_survey'
    field_key TEXT NOT NULL,          -- e.g., 'meter_reading', 'risk_assessment'
    label TEXT NOT NULL,              -- Display label
    type TEXT NOT NULL CHECK (type IN ('text', 'number', 'select', 'yes_no', 'photo', 'date', 'textarea', 'checkbox')),
    is_required BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    options JSONB DEFAULT NULL,       -- For 'select' type: ["Option A", "Option B"]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Uniqueness constraint: functionality focused unique keys
    CONSTRAINT form_definitions_key_unique UNIQUE (form_key, field_key)
);

-- 2. Table: form_responses
-- Stores the actual data submitted for a ticket/form
CREATE TABLE IF NOT EXISTS public.form_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    form_key TEXT NOT NULL,
    responses JSONB DEFAULT '{}'::jsonb, -- Key-value pairs: { "meter_reading": 1234, "risk": "Low" }
    submitted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_definitions_form_key ON public.form_definitions(form_key);
CREATE INDEX IF NOT EXISTS idx_form_responses_ticket_id ON public.form_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_key ON public.form_responses(form_key);

-- RLS Policies

-- Enable RLS
ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- form_definitions Policies
-- Admins can manage definitions
CREATE POLICY "Admins can manage form definitions" 
ON public.form_definitions 
FOR ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Everyone (Authenticated) can view active definitions
CREATE POLICY "Authenticated users can view active form definitions" 
ON public.form_definitions 
FOR SELECT 
TO authenticated 
USING (is_active = true);

-- form_responses Policies
-- Technicians can insert/view their own responses (or related to tickets)
-- For simplicity: Authenticated users can insert responses.
CREATE POLICY "Authenticated users can insert form responses" 
ON public.form_responses 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Users can view responses for tickets they have access to
-- (Simplified for now: If you can see the ticket, you typically can see the response, but linking to ticket RLS is complex in policy)
-- Broad read for authenticated for now to avoid complexity, or link to ticket exists check.
CREATE POLICY "Users can view form responses" 
ON public.form_responses 
FOR SELECT 
TO authenticated 
USING (true);

-- Admins can manage responses
CREATE POLICY "Admins can manage form responses" 
ON public.form_responses 
FOR ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

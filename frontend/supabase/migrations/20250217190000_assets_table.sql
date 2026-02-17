-- Create assets table
create table if not exists public.assets (
    id uuid not null default gen_random_uuid(),
    branch_id uuid not null references public.branches(id),
    name text not null,
    category_id text, -- Simplified to text as we lack a strict categories table FK for now, matches fault_category
    serial_number text,
    model_number text,
    purchase_date date,
    warranty_expiry date,
    status text not null default 'active' check (status in ('active', 'maintenance', 'retired', 'disposed')),
    notes text,
    qr_code text, -- Content of QR code
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    constraint assets_pkey primary key (id)
);

-- Add asset_id to tickets
alter table public.tickets 
add column if not exists asset_id uuid references public.assets(id);

-- RLS Policies for assets
alter table public.assets enable row level security;

create policy "Enable read access for authenticated users"
on public.assets for select
to authenticated
using (true);

create policy "Enable write access for admins and managers"
on public.assets for all
to authenticated
using (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role in ('admin', 'manager')
    )
);

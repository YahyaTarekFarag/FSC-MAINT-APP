-- Create spare_parts table
create table if not exists public.spare_parts (
  id bigint primary key generated always as identity,
  name_ar text not null,
  part_number text, -- SKU or internal code
  description text, -- description/specs
  quantity int default 0,
  min_threshold int default 5,
  price decimal(10,2) default 0,
  location text, -- Shelf/Bin location
  supplier text, -- Supplier name
  compatible_models text, -- Machines/Models this part fits
  image_url text,
  category_id uuid references public.fault_categories(id),
  unit_id bigint references public.unit_types(id), -- Added unit_id reference
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for spare_parts
alter table public.spare_parts enable row level security;

-- Policies for spare_parts
create policy "Admins have full access to spare_parts"
  on public.spare_parts
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'monitor')
    )
  );

create policy "Technicians can view spare_parts"
  on public.spare_parts
  for select
  to authenticated
  using (true);

-- Create inventory_transactions table
create table if not exists public.inventory_transactions (
  id bigint primary key generated always as identity,
  part_id bigint references public.spare_parts(id) on delete cascade,
  ticket_id uuid references public.tickets(id), -- Nullable for manual adjustments
  user_id uuid references auth.users(id),
  change_amount int not null, -- Negative for consumption, positive for restock
  transaction_type text check (transaction_type in ('consumption', 'restock', 'adjustment', 'return')),
  notes text,
  created_at timestamptz default now()
);

-- Enable RLS for inventory_transactions
alter table public.inventory_transactions enable row level security;

-- Policies for inventory_transactions
create policy "Admins can view all transactions"
  on public.inventory_transactions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'monitor')
    )
  );

create policy "Admins can insert transactions"
  on public.inventory_transactions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'monitor')
    )
  );

create policy "Users can view their own transactions"
  on public.inventory_transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Function to update spare_parts quantity on transaction insert
create or replace function public.update_part_quantity()
returns trigger as $$
begin
  update public.spare_parts
  set quantity = quantity + new.change_amount,
      updated_at = now()
  where id = new.part_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for updating quantity
create or replace trigger on_inventory_transaction
  after insert on public.inventory_transactions
  for each row
  execute function public.update_part_quantity();

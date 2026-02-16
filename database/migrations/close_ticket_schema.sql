-- Add closing fields to tickets
alter table public.tickets 
add column if not exists repair_cost decimal(10,2) default 0,
add column if not exists closed_at timestamptz;

-- Allow technicians to insert consumption transactions
create policy "Technicians can insert consumption transactions"
  on public.inventory_transactions
  for insert
  to authenticated
  with check (
    transaction_type = 'consumption'
    and
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('technician', 'admin', 'monitor')
    )
  );

-- Create a type for the parts input
create type public.part_consumption as (
  part_id bigint,
  quantity integer
);

-- Create the RPC function
create or replace function public.consume_parts(
  p_ticket_id uuid,
  p_user_id uuid,
  p_parts public.part_consumption[]
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_part public.part_consumption;
  v_current_stock integer;
begin
  -- Loop through each part
  foreach v_part in array p_parts
  loop
    -- Check stock
    select quantity into v_current_stock
    from public.spare_parts
    where id = v_part.part_id
    for update; -- Lock the row

    if not found then
      raise exception 'Part % not found', v_part.part_id;
    end if;

    if v_current_stock < v_part.quantity then
      raise exception 'Insufficient stock for part %', v_part.part_id;
    end if;

    -- Deduct stock
    update public.spare_parts
    set quantity = quantity - v_part.quantity
    where id = v_part.part_id;

    -- Record transaction
    insert into public.inventory_transactions (
      part_id,
      ticket_id,
      user_id,
      change_amount,
      transaction_type,
      notes
    ) values (
      v_part.part_id,
      p_ticket_id,
      p_user_id,
      -v_part.quantity, -- Negative for consumption
      'consumption',
      'Used in ticket completion'
    );
  end loop;

  return true;
end;
$$;

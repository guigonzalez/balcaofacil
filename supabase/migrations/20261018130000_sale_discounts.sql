alter table public.sales
  add column discount_cents bigint not null default 0
    check (discount_cents >= 0),
  add column discount_type text not null default 'none'
    check (discount_type in ('none', 'amount', 'percent')),
  add column discount_value numeric(12, 2) not null default 0
    check (discount_value >= 0),
  add column subtotal_cents bigint generated always as (total_cents + discount_cents) stored;

alter table public.sales
  add constraint sales_discount_value_matches_type
    check (
      (discount_type = 'none' and discount_cents = 0 and discount_value = 0)
      or (discount_type in ('amount', 'percent') and discount_value > 0 and discount_cents > 0)
    ),
  add constraint sales_discount_amount_matches_cents
    check (
      discount_type <> 'amount'
      or discount_cents = round(discount_value * 100)::bigint
    );

drop function public.complete_sale(uuid, uuid, text, jsonb);

create function public.complete_sale(
  target_store_id uuid,
  target_customer_id uuid,
  payment text,
  requested_items jsonb,
  requested_discount_type text,
  requested_discount_value numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_sale_id uuid;
  new_sale_number bigint;
  item record;
  product_row public.products%rowtype;
  calculated_subtotal bigint := 0;
  calculated_discount bigint := 0;
  normalized_discount_type text;
  normalized_discount_value numeric(12, 2);
begin
  if not public.is_store_member(target_store_id) then
    raise exception 'Store membership required' using errcode = '42501';
  end if;
  if payment not in ('Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Cartão', 'Outro') then
    raise exception 'Unsupported payment method' using errcode = '22023';
  end if;
  if requested_items is null or jsonb_typeof(requested_items) <> 'array'
    or jsonb_array_length(requested_items) = 0 then
    raise exception 'A sale must contain at least one item' using errcode = '22023';
  end if;
  if requested_discount_type is null
    or requested_discount_type not in ('none', 'amount', 'percent')
    or requested_discount_value is null
    or requested_discount_value::text in ('NaN', 'Infinity', '-Infinity')
    or requested_discount_value < 0
    or requested_discount_value <> round(requested_discount_value, 2)
    or (requested_discount_type = 'percent' and requested_discount_value > 100)
    or (requested_discount_type = 'none' and requested_discount_value <> 0) then
    raise exception 'Invalid sale discount' using errcode = '22023';
  end if;
  if target_customer_id is not null and not exists (
    select 1 from public.customers
    where id = target_customer_id and store_id = target_store_id
  ) then
    raise exception 'Customer does not belong to this store' using errcode = '22023';
  end if;

  insert into public.sales(
    store_id, customer_id, created_by, payment_method, total_cents
  ) values (
    target_store_id, target_customer_id, (select auth.uid()), payment, 0
  )
  returning id, sale_number into new_sale_id, new_sale_number;

  for item in
    select product_id, quantity
    from jsonb_to_recordset(requested_items) as requested(product_id uuid, quantity integer)
    order by product_id
  loop
    if item.quantity is null or item.quantity <= 0 then
      raise exception 'Sale quantities must be positive integers' using errcode = '22023';
    end if;

    select * into product_row
    from public.products
    where id = item.product_id and store_id = target_store_id and active
    for update;
    if not found then
      raise exception 'Active product not found' using errcode = 'P0002';
    end if;
    if product_row.stock < item.quantity then
      raise exception 'Insufficient stock for product %', product_row.name using errcode = '22023';
    end if;

    update public.products
    set stock = stock - item.quantity, updated_at = now()
    where id = product_row.id and store_id = target_store_id;

    insert into public.sale_items(
      store_id, sale_id, product_id, product_name, unit_price_cents, unit_cost_cents, quantity
    ) values (
      target_store_id, new_sale_id, product_row.id, product_row.name,
      product_row.price_cents, product_row.cost_cents, item.quantity
    );
    insert into public.stock_movements(
      store_id, product_id, created_by, kind, quantity_delta, reason, sale_id
    ) values (
      target_store_id, product_row.id, (select auth.uid()), 'sale', -item.quantity,
      'Venda VD-' || new_sale_number, new_sale_id
    );
    calculated_subtotal := calculated_subtotal + product_row.price_cents::bigint * item.quantity;
  end loop;

  if calculated_subtotal <= 0 then
    raise exception 'Sale subtotal must be positive' using errcode = '22023';
  end if;

  if requested_discount_type = 'percent' then
    calculated_discount := round(calculated_subtotal * requested_discount_value / 100)::bigint;
  elsif requested_discount_type = 'amount' then
    calculated_discount := round(requested_discount_value * 100)::bigint;
  end if;
  if calculated_discount > calculated_subtotal then
    raise exception 'Discount cannot exceed the sale subtotal' using errcode = '22023';
  end if;

  normalized_discount_type := case when calculated_discount = 0 then 'none' else requested_discount_type end;
  normalized_discount_value := case when calculated_discount = 0 then 0 else requested_discount_value end;
  update public.sales
  set total_cents = calculated_subtotal - calculated_discount,
      discount_cents = calculated_discount,
      discount_type = normalized_discount_type,
      discount_value = normalized_discount_value
  where id = new_sale_id;

  return jsonb_build_object(
    'id', new_sale_id,
    'sale_number', new_sale_number,
    'subtotal_cents', calculated_subtotal,
    'discount_cents', calculated_discount,
    'discount_type', normalized_discount_type,
    'discount_value', normalized_discount_value,
    'total_cents', calculated_subtotal - calculated_discount
  );
end;
$$;

revoke all on function public.complete_sale(uuid, uuid, text, jsonb, text, numeric) from public, anon;
grant execute on function public.complete_sale(uuid, uuid, text, jsonb, text, numeric) to authenticated;

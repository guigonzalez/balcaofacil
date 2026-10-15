alter table public.stores
  add column card_debit_fee_percent numeric(5, 2) not null default 0
    check (card_debit_fee_percent between 0 and 100),
  add column card_credit_fee_percent numeric(5, 2) not null default 0
    check (card_credit_fee_percent between 0 and 100);

grant update(name, card_debit_fee_percent, card_credit_fee_percent)
  on public.stores to authenticated;

alter table public.sales
  drop constraint sales_payment_method_check,
  add constraint sales_payment_method_check
    check (payment_method in (
      'Dinheiro',
      'Pix',
      'Cartão',
      'Cartão de débito',
      'Cartão de crédito',
      'Outro'
    ));

create or replace function public.complete_sale(
  target_store_id uuid,
  target_customer_id uuid,
  payment text,
  requested_items jsonb
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
  calculated_total bigint := 0;
begin
  if not public.is_store_member(target_store_id) then
    raise exception 'Store membership required' using errcode = '42501';
  end if;
  if payment not in ('Dinheiro', 'Pix', 'Cartão', 'Cartão de débito', 'Cartão de crédito', 'Outro') then
    raise exception 'Unsupported payment method' using errcode = '22023';
  end if;
  if requested_items is null or jsonb_typeof(requested_items) <> 'array'
    or jsonb_array_length(requested_items) = 0 then
    raise exception 'A sale must contain at least one item' using errcode = '22023';
  end if;
  if target_customer_id is not null and not exists (
    select 1 from public.customers
    where id = target_customer_id and store_id = target_store_id
  ) then
    raise exception 'Customer does not belong to this store' using errcode = '22023';
  end if;

  insert into public.sales(store_id, customer_id, created_by, payment_method, total_cents)
  values (target_store_id, target_customer_id, (select auth.uid()), payment, 1)
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
    calculated_total := calculated_total + product_row.price_cents::bigint * item.quantity;
  end loop;

  if calculated_total <= 0 then
    raise exception 'Sale total must be positive' using errcode = '22023';
  end if;
  update public.sales set total_cents = calculated_total where id = new_sale_id;

  return jsonb_build_object(
    'id', new_sale_id,
    'sale_number', new_sale_number,
    'total_cents', calculated_total
  );
end;
$$;

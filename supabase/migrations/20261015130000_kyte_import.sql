alter table public.products
  add column import_source_key text;

alter table public.products
  add constraint products_store_import_source_key_unique
  unique (store_id, import_source_key);

alter table public.sales
  add column import_source text,
  add column import_source_key text,
  add column import_reference text,
  add column import_details text,
  add column import_customer_name text,
  add column import_item_count integer,
  add column import_profit_cents bigint,
  add constraint sales_import_item_count_nonnegative
    check (import_item_count is null or import_item_count >= 0);

alter table public.sales
  drop constraint sales_total_cents_check,
  add constraint sales_total_cents_check check (total_cents >= 0);

alter table public.sales
  add constraint sales_store_import_source_key_unique
  unique (store_id, import_source_key);

create or replace function public.import_kyte_products(
  target_store_id uuid,
  import_records jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  item record;
  canonical_category text;
  inserted_product_id uuid;
  imported_count integer := 0;
  skipped_count integer := 0;
begin
  if not public.is_store_admin(target_store_id) then
    raise exception 'Store administrator required' using errcode = '42501';
  end if;
  if import_records is null or jsonb_typeof(import_records) <> 'array'
    or jsonb_array_length(import_records) = 0 or jsonb_array_length(import_records) > 1000 then
    raise exception 'Import must contain between 1 and 1000 products' using errcode = '22023';
  end if;

  for item in
    select source_key, name, sku, category, price_cents, cost_cents, stock, low_stock
    from jsonb_to_recordset(import_records) as products(
      source_key text,
      name text,
      sku text,
      category text,
      price_cents integer,
      cost_cents integer,
      stock integer,
      low_stock integer
    )
  loop
    if item.source_key is null or length(item.source_key) > 500
      or item.name is null or length(btrim(item.name)) not between 1 and 100
      or item.category is null or length(btrim(item.category)) not between 1 and 100
      or lower(btrim(item.category)) = 'todos'
      or item.price_cents is null or item.price_cents <= 0
      or (item.cost_cents is not null and item.cost_cents < 0)
      or item.stock is null or item.stock < 0
      or item.low_stock is null or item.low_stock < 0 then
      raise exception 'Invalid product in import batch' using errcode = '22023';
    end if;

    insert into public.product_categories(store_id, name)
    values (target_store_id, btrim(item.category))
    on conflict (store_id, lower(name)) do nothing;

    select name into canonical_category
    from public.product_categories
    where store_id = target_store_id and lower(name) = lower(btrim(item.category));

    insert into public.products(
      store_id, name, sku, category, price_cents, cost_cents, stock, low_stock, import_source_key
    ) values (
      target_store_id, btrim(item.name), nullif(btrim(item.sku), ''), canonical_category,
      item.price_cents, item.cost_cents, item.stock, item.low_stock, item.source_key
    )
    on conflict (store_id, import_source_key) do nothing
    returning id into inserted_product_id;

    if inserted_product_id is null then
      skipped_count := skipped_count + 1;
    else
      imported_count := imported_count + 1;
      if item.stock > 0 then
        insert into public.stock_movements(store_id, product_id, created_by, kind, quantity_delta, reason)
        values (target_store_id, inserted_product_id, (select auth.uid()), 'initial', item.stock, 'Importação do Kyte');
      end if;
    end if;
    inserted_product_id := null;
  end loop;

  return jsonb_build_object('imported', imported_count, 'skipped', skipped_count);
end;
$$;

create or replace function public.import_kyte_sales(
  target_store_id uuid,
  import_records jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  item record;
  imported_count integer := 0;
  skipped_count integer := 0;
  cancellation_reason text;
begin
  if not public.is_store_admin(target_store_id) then
    raise exception 'Store administrator required' using errcode = '42501';
  end if;
  if import_records is null or jsonb_typeof(import_records) <> 'array'
    or jsonb_array_length(import_records) = 0 or jsonb_array_length(import_records) > 1000 then
    raise exception 'Import must contain between 1 and 1000 sales' using errcode = '22023';
  end if;

  for item in
    select source_key, reference, status, created_at, total_cents, payment,
      customer_name, details, item_count, profit_cents
    from jsonb_to_recordset(import_records) as sales(
      source_key text,
      reference text,
      status text,
      created_at timestamptz,
      total_cents bigint,
      payment text,
      customer_name text,
      details text,
      item_count integer,
      profit_cents bigint
    )
  loop
    if item.source_key is null or length(item.source_key) > 500
      or item.reference is null or length(btrim(item.reference)) not between 1 and 100
      or item.status not in ('completed', 'cancelled')
      or item.created_at is null
      or item.total_cents is null or item.total_cents < 0
      or item.payment not in ('Dinheiro', 'Pix', 'Cartão', 'Outro')
      or item.item_count is null or item.item_count <= 0 then
      raise exception 'Invalid sale in import batch' using errcode = '22023';
    end if;

    cancellation_reason := case when item.status = 'cancelled' then 'Status importado do Kyte' else null end;
    insert into public.sales(
      store_id, created_by, payment_method, status, total_cents, created_at,
      cancelled_at, cancelled_by, cancel_reason, import_source, import_source_key,
      import_reference, import_details, import_customer_name, import_item_count,
      import_profit_cents
    ) values (
      target_store_id, (select auth.uid()), item.payment, item.status, item.total_cents, item.created_at,
      case when item.status = 'cancelled' then item.created_at else null end,
      case when item.status = 'cancelled' then (select auth.uid()) else null end,
      cancellation_reason, 'Kyte', item.source_key, btrim(item.reference),
      item.details, nullif(btrim(item.customer_name), ''), item.item_count, item.profit_cents
    )
    on conflict (store_id, import_source_key) do nothing;

    if found then
      imported_count := imported_count + 1;
    else
      skipped_count := skipped_count + 1;
    end if;
  end loop;

  return jsonb_build_object('imported', imported_count, 'skipped', skipped_count);
end;
$$;

revoke all on function public.import_kyte_products(uuid, jsonb) from public, anon;
revoke all on function public.import_kyte_sales(uuid, jsonb) from public, anon;
grant execute on function public.import_kyte_products(uuid, jsonb) to authenticated;
grant execute on function public.import_kyte_sales(uuid, jsonb) to authenticated;

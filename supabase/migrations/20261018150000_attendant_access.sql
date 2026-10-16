drop policy if exists "Members can view products" on public.products;
create policy "Store members can view active products"
  on public.products for select to authenticated
  using (
    public.is_store_member(store_id)
    and (active or public.is_store_admin(store_id))
  );

drop policy if exists "Members can create products" on public.products;
create policy "Admins can create products"
  on public.products for insert to authenticated
  with check (public.is_store_admin(store_id));

drop policy if exists "Members can update products" on public.products;
create policy "Admins can update products"
  on public.products for update to authenticated
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));

drop policy if exists "Members can create customers" on public.customers;
create policy "Admins can create customers"
  on public.customers for insert to authenticated
  with check (public.is_store_admin(store_id));

drop policy if exists "Members can update customers" on public.customers;
create policy "Admins can update customers"
  on public.customers for update to authenticated
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));

drop policy if exists "Members can create product categories" on public.product_categories;
create policy "Admins can create product categories"
  on public.product_categories for insert to authenticated
  with check (public.is_store_admin(store_id));

drop policy if exists "Members can delete unused product categories" on public.product_categories;
create policy "Admins can delete unused product categories"
  on public.product_categories for delete to authenticated
  using (public.is_store_admin(store_id));

drop policy if exists "Members can view sales" on public.sales;
create policy "Admins can view sales"
  on public.sales for select to authenticated
  using (public.is_store_admin(store_id));

drop policy if exists "Members can view sale items" on public.sale_items;
create policy "Admins can view sale items"
  on public.sale_items for select to authenticated
  using (public.is_store_admin(store_id));

drop policy if exists "Members can view stock movements" on public.stock_movements;
create policy "Admins can view stock movements"
  on public.stock_movements for select to authenticated
  using (public.is_store_admin(store_id));

drop policy if exists "Store members can upload product images" on storage.objects;
create policy "Store admins can upload product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.store_members as members
      where members.store_id::text = (storage.foldername(name))[1]
        and members.user_id = (select auth.uid())
        and members.role in ('owner', 'admin')
    )
  );

drop policy if exists "Store members can update product images" on storage.objects;
create policy "Store admins can update product images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.store_members as members
      where members.store_id::text = (storage.foldername(name))[1]
        and members.user_id = (select auth.uid())
        and members.role in ('owner', 'admin')
    )
  )
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.store_members as members
      where members.store_id::text = (storage.foldername(name))[1]
        and members.user_id = (select auth.uid())
        and members.role in ('owner', 'admin')
    )
  );

drop policy if exists "Store members can delete product images" on storage.objects;
create policy "Store admins can delete product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.store_members as members
      where members.store_id::text = (storage.foldername(name))[1]
        and members.user_id = (select auth.uid())
        and members.role in ('owner', 'admin')
    )
  );

create or replace function public.create_product(
  target_store_id uuid,
  product_name text,
  product_sku text,
  product_category text,
  product_price_cents integer,
  product_cost_cents integer,
  initial_stock integer,
  product_low_stock integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_product_id uuid;
begin
  if not public.is_store_admin(target_store_id) then
    raise exception 'Store administrator required' using errcode = '42501';
  end if;
  if product_name is null or length(btrim(product_name)) not between 1 and 100
    or product_price_cents is null or product_price_cents <= 0
    or (product_cost_cents is not null and product_cost_cents < 0)
    or initial_stock is null or initial_stock < 0
    or product_low_stock is null or product_low_stock < 0 then
    raise exception 'Invalid product values' using errcode = '22023';
  end if;

  insert into public.products(store_id, name, sku, category, price_cents, cost_cents, stock, low_stock)
  values (
    target_store_id, btrim(product_name), nullif(btrim(product_sku), ''),
    coalesce(nullif(btrim(product_category), ''), 'Outros'),
    product_price_cents, product_cost_cents, initial_stock, product_low_stock
  )
  returning id into new_product_id;

  if initial_stock > 0 then
    insert into public.stock_movements(store_id, product_id, created_by, kind, quantity_delta, reason)
    values (target_store_id, new_product_id, (select auth.uid()), 'initial', initial_stock, 'Estoque inicial');
  end if;
  return new_product_id;
end;
$$;

create or replace function public.adjust_stock(
  target_store_id uuid,
  target_product_id uuid,
  new_stock integer,
  movement_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_stock integer;
  delta integer;
begin
  if not public.is_store_admin(target_store_id) then
    raise exception 'Store administrator required' using errcode = '42501';
  end if;
  if new_stock is null or new_stock < 0
    or movement_reason is null or length(btrim(movement_reason)) not between 1 and 160 then
    raise exception 'Invalid stock adjustment' using errcode = '22023';
  end if;

  select stock into previous_stock
  from public.products
  where id = target_product_id and store_id = target_store_id and active
  for update;
  if not found then
    raise exception 'Active product not found' using errcode = 'P0002';
  end if;

  delta := new_stock - previous_stock;
  if delta = 0 then
    raise exception 'Stock is unchanged' using errcode = '22023';
  end if;

  update public.products set stock = new_stock, updated_at = now()
  where id = target_product_id and store_id = target_store_id;
  insert into public.stock_movements(store_id, product_id, created_by, kind, quantity_delta, reason)
  values (
    target_store_id, target_product_id, (select auth.uid()),
    case when delta > 0 then 'entry' else 'correction' end, delta, btrim(movement_reason)
  );
  return new_stock;
end;
$$;

create or replace function public.cancel_sale(
  target_store_id uuid,
  target_sale_id uuid,
  reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  sale_row public.sales%rowtype;
  item record;
begin
  if not public.is_store_admin(target_store_id) then
    raise exception 'Store administrator required' using errcode = '42501';
  end if;
  if reason is null or length(btrim(reason)) not between 1 and 160 then
    raise exception 'A cancellation reason is required' using errcode = '22023';
  end if;

  select * into sale_row
  from public.sales
  where id = target_sale_id and store_id = target_store_id
  for update;
  if not found or sale_row.status <> 'completed' then
    raise exception 'Completed sale not found' using errcode = 'P0002';
  end if;

  update public.sales
  set status = 'cancelled', cancel_reason = btrim(reason),
      cancelled_at = now(), cancelled_by = (select auth.uid())
  where id = target_sale_id and store_id = target_store_id;

  for item in
    select product_id, product_name, quantity
    from public.sale_items
    where sale_id = target_sale_id and store_id = target_store_id
  loop
    if item.product_id is not null then
      update public.products
      set stock = stock + item.quantity, updated_at = now()
      where id = item.product_id and store_id = target_store_id;
      insert into public.stock_movements(
        store_id, product_id, created_by, kind, quantity_delta, reason, sale_id
      ) values (
        target_store_id, item.product_id, (select auth.uid()), 'sale-return',
        item.quantity, 'Cancelamento VD-' || sale_row.sale_number || ': ' || btrim(reason), target_sale_id
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.create_product(uuid, text, text, text, integer, integer, integer, integer) from public, anon;
revoke all on function public.adjust_stock(uuid, uuid, integer, text) from public, anon;
revoke all on function public.cancel_sale(uuid, uuid, text) from public, anon;
grant execute on function public.create_product(uuid, text, text, text, integer, integer, integer, integer) to authenticated;
grant execute on function public.adjust_stock(uuid, uuid, integer, text) to authenticated;
grant execute on function public.cancel_sale(uuid, uuid, text) to authenticated;

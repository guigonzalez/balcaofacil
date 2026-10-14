create extension if not exists pgcrypto with schema extensions;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'attendant')),
  joined_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create index store_members_user_id_idx on public.store_members(user_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  sku text,
  category text not null default 'Outros',
  price_cents integer not null check (price_cents > 0),
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock integer not null default 3 check (low_stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_store_sku_unique
  on public.products(store_id, lower(sku))
  where sku is not null and btrim(sku) <> '';
create index products_store_active_name_idx on public.products(store_id, active, name);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_store_name_idx on public.customers(store_id, name);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sale_number bigint generated always as identity,
  customer_id uuid references public.customers(id) on delete set null,
  created_by uuid not null references auth.users(id),
  payment_method text not null check (payment_method in ('Dinheiro', 'Pix', 'Cartão', 'Outro')),
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  total_cents bigint not null check (total_cents > 0),
  cancel_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (store_id, sale_number),
  check (
    (status = 'completed' and cancelled_at is null and cancelled_by is null)
    or (
      status = 'cancelled'
      and cancelled_at is not null
      and cancelled_by is not null
      and cancel_reason is not null
      and length(btrim(cancel_reason)) > 0
    )
  )
);

create index sales_store_created_at_idx on public.sales(store_id, created_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents > 0),
  unit_cost_cents integer check (unit_cost_cents is null or unit_cost_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents bigint generated always as (unit_price_cents::bigint * quantity) stored
);

create index sale_items_store_sale_idx on public.sale_items(store_id, sale_id);
create index sale_items_store_product_idx on public.sale_items(store_id, product_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  created_by uuid references auth.users(id),
  kind text not null check (kind in ('initial', 'entry', 'correction', 'sale', 'sale-return')),
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null check (length(btrim(reason)) between 1 and 160),
  sale_id uuid references public.sales(id) on delete set null,
  created_at timestamptz not null default now()
);

create index stock_movements_store_created_at_idx on public.stock_movements(store_id, created_at desc);
create index stock_movements_store_product_idx on public.stock_movements(store_id, product_id);

create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = target_store_id
      and sm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_store_admin(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = target_store_id
      and sm.user_id = (select auth.uid())
      and sm.role in ('owner', 'admin')
  );
$$;

create or replace function public.bootstrap_store(store_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  new_store_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.store_members
    where user_id = (select auth.uid())
  ) then
    raise exception 'This user already belongs to a store' using errcode = '23505';
  end if;

  if store_name is null or length(btrim(store_name)) not between 1 and 80 then
    raise exception 'Store name must contain between 1 and 80 characters' using errcode = '22023';
  end if;

  insert into public.stores(name) values (btrim(store_name))
  returning id into new_store_id;

  insert into public.store_members(store_id, user_id, role)
  values (new_store_id, (select auth.uid()), 'owner');

  return new_store_id;
end;
$$;

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
  if not public.is_store_member(target_store_id) then
    raise exception 'Store membership required' using errcode = '42501';
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
  if not public.is_store_member(target_store_id) then
    raise exception 'Store membership required' using errcode = '42501';
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
  if payment not in ('Dinheiro', 'Pix', 'Cartão', 'Outro') then
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
  if not public.is_store_member(target_store_id) then
    raise exception 'Store membership required' using errcode = '42501';
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

alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;

create policy "Members can view their stores"
  on public.stores for select to authenticated
  using (public.is_store_member(id));
create policy "Admins can update their stores"
  on public.stores for update to authenticated
  using (public.is_store_admin(id))
  with check (public.is_store_admin(id));

create policy "Members can view store memberships"
  on public.store_members for select to authenticated
  using (public.is_store_member(store_id));

create policy "Members can view products"
  on public.products for select to authenticated
  using (public.is_store_member(store_id));
create policy "Members can create products"
  on public.products for insert to authenticated
  with check (public.is_store_member(store_id));
create policy "Members can update products"
  on public.products for update to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

create policy "Members can view customers"
  on public.customers for select to authenticated
  using (public.is_store_member(store_id));
create policy "Members can create customers"
  on public.customers for insert to authenticated
  with check (public.is_store_member(store_id));
create policy "Members can update customers"
  on public.customers for update to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

create policy "Members can view sales"
  on public.sales for select to authenticated
  using (public.is_store_member(store_id));
create policy "Members can view sale items"
  on public.sale_items for select to authenticated
  using (public.is_store_member(store_id));
create policy "Members can view stock movements"
  on public.stock_movements for select to authenticated
  using (public.is_store_member(store_id));

revoke all on public.stores, public.store_members, public.products, public.customers,
  public.sales, public.sale_items, public.stock_movements from anon, authenticated;
grant select, update(name) on public.stores to authenticated;
grant select on public.store_members to authenticated;
grant select on public.products, public.sales, public.sale_items, public.stock_movements to authenticated;
grant update(name, sku, category, price_cents, cost_cents, low_stock, active)
  on public.products to authenticated;
grant select on public.customers to authenticated;
grant insert(store_id, name, phone, email) on public.customers to authenticated;
grant update(name, phone, email) on public.customers to authenticated;

revoke all on function public.is_store_member(uuid) from public, anon;
revoke all on function public.is_store_admin(uuid) from public, anon;
revoke all on function public.bootstrap_store(text) from public, anon;
revoke all on function public.create_product(uuid, text, text, text, integer, integer, integer, integer) from public, anon;
revoke all on function public.adjust_stock(uuid, uuid, integer, text) from public, anon;
revoke all on function public.complete_sale(uuid, uuid, text, jsonb) from public, anon;
revoke all on function public.cancel_sale(uuid, uuid, text) from public, anon;
grant execute on function public.is_store_member(uuid) to authenticated;
grant execute on function public.is_store_admin(uuid) to authenticated;
grant execute on function public.bootstrap_store(text) to authenticated;
grant execute on function public.create_product(uuid, text, text, text, integer, integer, integer, integer) to authenticated;
grant execute on function public.adjust_stock(uuid, uuid, integer, text) to authenticated;
grant execute on function public.complete_sale(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.cancel_sale(uuid, uuid, text) to authenticated;

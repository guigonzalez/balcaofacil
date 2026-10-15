create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100 and lower(btrim(name)) <> 'todos'),
  created_at timestamptz not null default now(),
  unique (store_id, name)
);

insert into public.product_categories(store_id, name)
select stores.id, defaults.name
from public.stores
cross join (values ('Casa'), ('Papelaria'), ('Cuidados'), ('Acessórios'), ('Outros')) as defaults(name)
on conflict (store_id, name) do nothing;

update public.products as products
set category = categories.name
from public.product_categories as categories
where categories.store_id = products.store_id
  and lower(categories.name) = lower(btrim(products.category))
  and products.category <> categories.name;

insert into public.product_categories(store_id, name)
select distinct on (products.store_id, lower(btrim(products.category)))
  products.store_id, btrim(products.category)
from public.products
where length(btrim(products.category)) between 1 and 100
  and lower(btrim(products.category)) <> 'todos'
  and not exists (
    select 1 from public.product_categories as existing
    where existing.store_id = products.store_id
      and lower(existing.name) = lower(btrim(products.category))
  )
order by products.store_id, lower(btrim(products.category)), btrim(products.category)
on conflict (store_id, name) do nothing;

update public.products as products
set category = categories.name
from public.product_categories as categories
where categories.store_id = products.store_id
  and lower(categories.name) = lower(btrim(products.category))
  and products.category <> categories.name;

create unique index product_categories_store_name_ci_unique
  on public.product_categories(store_id, lower(name));

alter table public.products
  add constraint products_store_category_fk
  foreign key (store_id, category)
  references public.product_categories(store_id, name)
  on update cascade
  on delete restrict;

alter table public.product_categories enable row level security;

create policy "Members can view product categories"
  on public.product_categories for select to authenticated
  using (public.is_store_member(store_id));
create policy "Members can create product categories"
  on public.product_categories for insert to authenticated
  with check (public.is_store_member(store_id));
create policy "Members can delete unused product categories"
  on public.product_categories for delete to authenticated
  using (public.is_store_member(store_id));

revoke all on public.product_categories from anon, authenticated;
grant select on public.product_categories to authenticated;
grant insert(store_id, name) on public.product_categories to authenticated;
grant delete on public.product_categories to authenticated;

create or replace function public.create_default_product_categories()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.product_categories(store_id, name)
  values
    (new.id, 'Casa'),
    (new.id, 'Papelaria'),
    (new.id, 'Cuidados'),
    (new.id, 'Acessórios'),
    (new.id, 'Outros');
  return new;
end;
$$;

create trigger stores_create_default_product_categories
  after insert on public.stores
  for each row execute function public.create_default_product_categories();

revoke all on function public.create_default_product_categories() from public, anon, authenticated;

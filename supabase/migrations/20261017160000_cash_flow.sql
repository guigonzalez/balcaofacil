create table public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  direction text not null check (direction in ('payable', 'receivable')),
  description text not null check (length(btrim(description)) between 1 and 120),
  counterparty text,
  category text not null check (length(btrim(category)) between 1 and 60),
  amount_cents bigint not null check (amount_cents > 0),
  due_date date not null,
  payment_method text check (
    payment_method is null
    or payment_method in ('Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Transferência', 'Outro')
  ),
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index cash_entries_store_due_date_idx
  on public.cash_entries(store_id, due_date, direction);
create index cash_entries_store_settled_at_idx
  on public.cash_entries(store_id, settled_at);

alter table public.cash_entries enable row level security;

create policy "Admins can view cash entries"
  on public.cash_entries for select to authenticated
  using (public.is_store_admin(store_id));
create policy "Admins can create cash entries"
  on public.cash_entries for insert to authenticated
  with check (public.is_store_admin(store_id) and created_by = (select auth.uid()));
create policy "Admins can settle cash entries"
  on public.cash_entries for update to authenticated
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));
create policy "Admins can delete cash entries"
  on public.cash_entries for delete to authenticated
  using (public.is_store_admin(store_id));

revoke all on public.cash_entries from anon, authenticated;
grant select on public.cash_entries to authenticated;
grant insert(id, store_id, created_by, direction, description, counterparty, category, amount_cents, due_date, payment_method)
  on public.cash_entries to authenticated;
grant update(settled_at) on public.cash_entries to authenticated;
grant delete on public.cash_entries to authenticated;

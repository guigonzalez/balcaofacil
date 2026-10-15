alter table public.sales
  alter column created_by drop not null;

alter table public.sales
  drop constraint if exists sales_created_by_fkey,
  drop constraint if exists sales_cancelled_by_fkey,
  add constraint sales_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null,
  add constraint sales_cancelled_by_fkey
    foreign key (cancelled_by) references auth.users(id) on delete set null;

alter table public.stock_movements
  drop constraint if exists stock_movements_created_by_fkey,
  add constraint stock_movements_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

alter table public.cash_entries
  alter column created_by drop not null;

alter table public.cash_entries
  drop constraint if exists cash_entries_created_by_fkey,
  add constraint cash_entries_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

create or replace function public.prepare_user_account_deletion(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_store_id uuid;
  target_role text;
  successor_user_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  select store_id, role into target_store_id, target_role
  from public.store_members
  where user_id = target_user_id
  for update;

  if not found or target_role <> 'owner' then
    return null;
  end if;

  perform 1
  from public.stores
  where id = target_store_id
  for update;

  select user_id into successor_user_id
  from public.store_members
  where store_id = target_store_id
    and user_id <> target_user_id
  order by
    case role when 'admin' then 0 when 'attendant' then 1 else 2 end,
    joined_at,
    user_id
  limit 1
  for update;

  if successor_user_id is null then
    delete from public.stores where id = target_store_id;
    return target_store_id;
  end if;

  update public.store_members
  set role = 'admin'
  where store_id = target_store_id and user_id = target_user_id;

  update public.store_members
  set role = 'owner'
  where store_id = target_store_id and user_id = successor_user_id;

  return null;
end;
$$;

revoke all on function public.prepare_user_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_user_account_deletion(uuid) to service_role;

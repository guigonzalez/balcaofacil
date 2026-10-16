alter table public.sales
  add column observation text not null default ''
    check (length(observation) <= 500);

create function public.complete_sale(
  target_store_id uuid,
  target_customer_id uuid,
  payment text,
  requested_items jsonb,
  requested_discount_type text,
  requested_discount_value numeric,
  requested_observation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  sale_result jsonb;
  new_sale_id uuid;
  normalized_observation text := coalesce(btrim(requested_observation), '');
begin
  if length(normalized_observation) > 500 then
    raise exception 'Sale observation must not exceed 500 characters' using errcode = '22023';
  end if;

  sale_result := public.complete_sale(
    target_store_id,
    target_customer_id,
    payment,
    requested_items,
    requested_discount_type,
    requested_discount_value
  );
  new_sale_id := (sale_result ->> 'id')::uuid;

  update public.sales
  set observation = normalized_observation
  where id = new_sale_id and store_id = target_store_id;
  if not found then
    raise exception 'Could not save sale observation' using errcode = 'P0002';
  end if;

  return sale_result || jsonb_build_object('observation', normalized_observation);
end;
$$;

revoke all on function public.complete_sale(uuid, uuid, text, jsonb, text, numeric, text) from public, anon;
grant execute on function public.complete_sale(uuid, uuid, text, jsonb, text, numeric, text) to authenticated;

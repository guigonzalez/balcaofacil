alter table public.products
  add column image_path text;

grant update(image_path) on public.products to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Store members can view product image metadata"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.store_members as members
      where members.store_id::text = (storage.foldername(name))[1]
        and members.user_id = (select auth.uid())
    )
  );

create policy "Store members can upload product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.store_members as members
      where members.store_id::text = (storage.foldername(name))[1]
        and members.user_id = (select auth.uid())
    )
  );

create policy "Store members can update product images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.store_members as members
      where members.store_id::text = (storage.foldername(name))[1]
        and members.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.store_members as members
      where members.store_id::text = (storage.foldername(name))[1]
        and members.user_id = (select auth.uid())
    )
  );

create policy "Store members can delete product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.store_members as members
      where members.store_id::text = (storage.foldername(name))[1]
        and members.user_id = (select auth.uid())
    )
  );

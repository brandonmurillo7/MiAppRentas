-- Run this in Supabase SQL Editor to configure Storage for property images

-- 1) Create bucket (public so app can use public URLs)
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

-- 2) Recreate policies to avoid stale/conflicting RLS definitions
drop policy if exists "Authenticated users can upload property images" on storage.objects;
drop policy if exists "Authenticated users can read property images" on storage.objects;
drop policy if exists "Authenticated users can update property images" on storage.objects;
drop policy if exists "Authenticated users can delete property images" on storage.objects;

create policy "Authenticated users can upload property images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'property-images' and auth.role() = 'authenticated');

create policy "Authenticated users can read property images"
on storage.objects
for select
to authenticated
using (bucket_id = 'property-images' and auth.role() = 'authenticated');

create policy "Authenticated users can update property images"
on storage.objects
for update
to authenticated
using (bucket_id = 'property-images' and auth.role() = 'authenticated')
with check (bucket_id = 'property-images' and auth.role() = 'authenticated');

create policy "Authenticated users can delete property images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'property-images' and auth.role() = 'authenticated');

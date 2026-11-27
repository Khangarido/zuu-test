-- Run on the SELF-HOSTED db, after storage-policies.sql (the policies exported from hosted):
--   docker exec -i supabase-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 -f - < deploy/sql/storage-extra.sql
--
-- Why: the app uploads to four buckets (avatars, class-photos, medee-photos, question-images),
-- but the hosted project only has `avatars` and `question-images`, and policies only for
-- `question-images`. So avatar, class-photo and medee-photo uploads were being rejected by RLS
-- (or the bucket did not exist). This creates what the code expects. Idempotent.
--
-- Mirrors supabase/profile_fields.sql for avatars (anyone may upload at sign-up, because the
-- user has no session before verifying their email; owner-only update/delete), and applies the
-- same shape to the two other buckets, except uploads need a signed-in user.

insert into storage.buckets (id, name, public) values
  ('avatars',      'avatars',      true),
  ('class-photos', 'class-photos', true),
  ('medee-photos', 'medee-photos', true)
on conflict (id) do update set public = excluded.public;

-- avatars
drop policy if exists "Public avatar uploads" on storage.objects;
create policy "Public avatar uploads" on storage.objects for insert to public
  with check (bucket_id = 'avatars');

drop policy if exists "Public avatar reads" on storage.objects;
create policy "Public avatar reads" on storage.objects for select to public
  using (bucket_id = 'avatars');

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '.', 1));

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '.', 1));

-- class-photos and medee-photos: public read, signed-in users write
do $$
declare b text;
begin
  foreach b in array array['class-photos', 'medee-photos'] loop
    execute format('drop policy if exists %I on storage.objects', b || ' public read');
    execute format('create policy %I on storage.objects for select to public using (bucket_id = %L)', b || ' public read', b);
    execute format('drop policy if exists %I on storage.objects', b || ' authenticated upload');
    execute format('create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L)', b || ' authenticated upload', b);
    execute format('drop policy if exists %I on storage.objects', b || ' authenticated update');
    execute format('create policy %I on storage.objects for update to authenticated using (bucket_id = %L)', b || ' authenticated update', b);
    execute format('drop policy if exists %I on storage.objects', b || ' authenticated delete');
    execute format('create policy %I on storage.objects for delete to authenticated using (bucket_id = %L)', b || ' authenticated delete', b);
  end loop;
end $$;

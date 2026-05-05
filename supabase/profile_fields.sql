-- ─── Add new columns to profiles ─────────────────────────────────────────────
alter table profiles
  add column if not exists first_name     text,
  add column if not exists last_name      text,
  add column if not exists sex            text,
  add column if not exists age            integer,
  add column if not exists aimag          text,
  add column if not exists sum_district   text,
  add column if not exists receive_emails boolean default false,
  add column if not exists avatar_url     text;

-- ─── Avatars storage bucket ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow anyone to upload to avatars bucket (profile photos on sign-up)
create policy "Public avatar uploads"
  on storage.objects for insert
  to public
  with check (bucket_id = 'avatars');

-- Allow anyone to read avatar files
create policy "Public avatar reads"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Allow users to update/delete their own avatar
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '.', 1));

create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '.', 1));

-- ─── Sync new fields from auth.users metadata on sign-up ─────────────────────
-- Run this if your profiles table is populated via a trigger.
-- Update the trigger function to also map the new fields:

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (
    id, email, full_name, first_name, last_name,
    sex, age, aimag, sum_district,
    phone, school, grade, receive_emails, role
  ) values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'sex',
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'aimag',
    new.raw_user_meta_data->>'sum_district',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'school',
    new.raw_user_meta_data->>'grade',
    coalesce((new.raw_user_meta_data->>'receive_emails')::boolean, false),
    'student'
  )
  on conflict (id) do update set
    email          = excluded.email,
    full_name      = excluded.full_name,
    first_name     = excluded.first_name,
    last_name      = excluded.last_name,
    sex            = excluded.sex,
    age            = excluded.age,
    aimag          = excluded.aimag,
    sum_district   = excluded.sum_district,
    phone          = excluded.phone,
    school         = excluded.school,
    grade          = excluded.grade,
    receive_emails = excluded.receive_emails;
  return new;
end;
$$;

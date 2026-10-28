-- Run on the SELF-HOSTED db after auth-data.sql and public.sql are restored.
--   docker exec -i supabase-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 -f - < deploy/sql/post-restore.sql
--
-- Run as supabase_admin (superuser): it owns the supabase_realtime publication and
-- the auth schema, which `postgres` may not be allowed to alter.
--
-- These objects live outside the `public` schema so pg_dump -n public does not
-- carry them. Compare with the output of preflight-hosted.sql on the hosted side
-- and add anything extra you find there.

-- 1. Profile row on sign-up. public.handle_new_user() came with the public dump;
--    this re-attaches it to auth.users (same as the tail of supabase/ranking_and_profiles.sql).
--    Created AFTER auth.users was loaded, so existing users do not fire it.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Realtime: the notification bell subscribes to INSERTs on public.notifications
--    (src/components/notification-bell.tsx). Publication membership is not part of
--    the schema-only dump, so add it explicitly. Add other tables here if the
--    preflight "realtime publication membership" output lists more.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

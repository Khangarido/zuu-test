-- READ-ONLY. Run against the HOSTED Supabase project before migrating.
--   docker run --rm -i -e SRC_DB_URL postgres:17-alpine \
--     sh -c 'psql "$SRC_DB_URL" -X -f -' < deploy/sql/preflight-hosted.sql
-- Answers: Postgres major version, DB size, extensions to reproduce, what is
-- published to Realtime, custom triggers, buckets and their sizes, row counts.

\echo '== server version'
select version();

\echo '== database size'
select pg_size_pretty(pg_database_size(current_database())) as db_size;

\echo '== extensions (each must exist on the target)'
select extname, extversion, extnamespace::regnamespace as schema from pg_extension order by 1;

\echo '== realtime publication membership (re-added by post-restore.sql)'
select pubname, schemaname, tablename from pg_publication_tables order by 1, 2, 3;

\echo '== non-internal triggers on auth.users / storage.objects (not carried by the public dump)'
select tgrelid::regclass as on_table, tgname, pg_get_triggerdef(oid) as definition
from pg_trigger
where not tgisinternal and tgrelid in ('auth.users'::regclass, 'storage.objects'::regclass)
order by 1, 2;

\echo '== storage buckets'
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by id;

\echo '== storage objects per bucket'
select bucket_id, count(*) as objects,
       pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as total_size
from storage.objects group by bucket_id order by bucket_id;

\echo '== auth users'
select count(*) as auth_users from auth.users;

\echo '== public tables by approximate row count'
select relname as table_name, n_live_tup as approx_rows
from pg_stat_user_tables where schemaname = 'public' order by n_live_tup desc;

\echo '== custom roles (must be recreated by hand if any)'
select rolname from pg_roles
where rolname !~ '^(pg_|supabase_|authenticator$|anon$|authenticated$|service_role$|dashboard_user$|postgres$|pgbouncer$|pgsodium|cli_login)'
order by 1;

\echo '== pg_cron / scheduled jobs (not migrated automatically)'
select to_regclass('cron.job') is not null as has_pg_cron;

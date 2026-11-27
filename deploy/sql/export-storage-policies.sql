-- READ-ONLY on the hosted project. Emits re-runnable CREATE POLICY statements
-- for every policy on the storage schema (covers avatars AND the buckets whose
-- policies were created in the dashboard and are not in supabase/*.sql).
--
--   docker run --rm -i -e SRC_DB_URL postgres:17-alpine \
--     sh -c 'psql "$SRC_DB_URL" -X -q -A -t -f -' \
--     < deploy/sql/export-storage-policies.sql > storage-policies.sql
--
-- Review storage-policies.sql, then apply it on the target (MIGRATION.md step 6).
select format(
         E'drop policy if exists %I on %I.%I;\ncreate policy %I on %I.%I as %s for %s to %s%s%s;\n',
         policyname, schemaname, tablename,
         policyname, schemaname, tablename,
         lower(permissive),
         lower(cmd),
         (select string_agg(quote_ident(r), ', ') from unnest(roles) as r),
         case when qual is not null then E'\n  using (' || qual || ')' else '' end,
         case when with_check is not null then E'\n  with check (' || with_check || ')' else '' end
       )
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;

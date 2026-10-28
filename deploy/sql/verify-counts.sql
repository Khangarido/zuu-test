-- READ-ONLY. Exact row counts for every public table plus auth/storage essentials.
-- Run on BOTH sides and diff:
--   hosted:  docker run --rm -i -e SRC_DB_URL postgres:17-alpine sh -c 'psql "$SRC_DB_URL" -X -A -t -F" " -f -' < deploy/sql/verify-counts.sql > counts.src
--   target:  docker exec -i supabase-db psql -U postgres -d postgres -X -A -t -F" " -f - < deploy/sql/verify-counts.sql > counts.dst
--   diff counts.src counts.dst && echo IDENTICAL
select 'public.' || table_name, (xpath('/row/c/text()',
         query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
union all select 'auth.users',      count(*)::text from auth.users
union all select 'auth.identities', count(*)::text from auth.identities
order by 1;

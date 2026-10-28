-- Rewrite stored absolute URLs after moving Storage from hosted Supabase to the
-- self-hosted API host. avatars, class/medee photos and question images are saved
-- as full public URLs (storage.getPublicUrl()), so they would keep pointing at
-- https://<ref>.supabase.co/... forever.
--
-- Scans EVERY text / varchar / jsonb / text[] column of the public schema, plus
-- auth.users.raw_user_meta_data, auth.users.raw_app_meta_data and
-- auth.identities.identity_data (sign-up stores avatar_url in user metadata).
--
-- DRY RUN (default, changes nothing, prints what would change):
--   docker exec -i supabase-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 \
--     -v old=https://abcdefgh.supabase.co -v new=https://supabase.zuutest.site -v apply=0 \
--     -f - < deploy/sql/rewrite-urls.sql
-- APPLY (single transaction): same command with -v apply=1
-- VERIFY: run the dry run again; it must report 0 rows.
--
-- Note: updates fire normal UPDATE triggers (e.g. updated_at) on affected rows.

\set ON_ERROR_STOP on
select set_config('zuu.old',   :'old',   false) as zuu_old,
       set_config('zuu.new',   :'new',   false) as zuu_new,
       set_config('zuu.apply', :'apply', false) as zuu_apply \gset

begin;

do $$
declare
  r        record;
  old_url  text    := current_setting('zuu.old');
  new_url  text    := current_setting('zuu.new');
  do_apply boolean := current_setting('zuu.apply') = '1';
  cond     text;
  setexpr  text;
  n        bigint;
  total    bigint := 0;
begin
  if old_url = '' or new_url = '' then
    raise exception 'old and new must both be set';
  end if;

  for r in
    select c.table_schema, c.table_name, c.column_name, c.data_type, c.udt_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where t.table_type = 'BASE TABLE'
      and c.is_generated = 'NEVER'
      and (
            c.table_schema = 'public'
         or (c.table_schema = 'auth'
             and (c.table_name, c.column_name) in
                 (('users', 'raw_user_meta_data'),
                  ('users', 'raw_app_meta_data'),
                  ('identities', 'identity_data')))
      )
      and (c.data_type in ('text', 'character varying', 'jsonb')
           or c.udt_name in ('_text', '_varchar'))
    order by c.table_schema, c.table_name, c.column_name
  loop
    if r.data_type = 'jsonb' then
      cond    := format('position(%L in %I::text) > 0', old_url, r.column_name);
      setexpr := format('%I = replace(%I::text, %L, %L)::jsonb',
                        r.column_name, r.column_name, old_url, new_url);
    elsif r.udt_name in ('_text', '_varchar') then
      cond    := format('exists (select 1 from unnest(%I) as x where position(%L in x) > 0)',
                        r.column_name, old_url);
      setexpr := format('%I = array(select replace(x, %L, %L) from unnest(%I) with ordinality as u(x, i) order by i)',
                        r.column_name, old_url, new_url, r.column_name);
    else
      cond    := format('position(%L in %I) > 0', old_url, r.column_name);
      setexpr := format('%I = replace(%I, %L, %L)',
                        r.column_name, r.column_name, old_url, new_url);
    end if;

    execute format('select count(*) from %I.%I where %s',
                   r.table_schema, r.table_name, cond) into n;

    if n > 0 then
      raise notice '%  %.%.%', lpad(n::text, 8), r.table_schema, r.table_name, r.column_name;
      total := total + n;
      if do_apply then
        execute format('update %I.%I set %s where %s',
                       r.table_schema, r.table_name, setexpr, cond);
      end if;
    end if;
  end loop;

  if do_apply then
    raise notice 'UPDATED % value(s)', total;
  else
    raise notice 'DRY RUN: % value(s) would change. Re-run with -v apply=1', total;
  end if;
end $$;

commit;

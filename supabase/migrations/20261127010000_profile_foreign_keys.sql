-- PostgREST can only embed `profiles!<column>(...)` when a foreign key to public.profiles exists.
-- Several tables only referenced auth.users, so those embeds failed (PGRST200) and lists came back empty.
do $$
declare
  p record;
begin
  for p in
    select * from (values
      ('classes','teacher_id'), ('class_posts','author_id'), ('class_members','user_id'),
      ('medee_posts','author_id'), ('medee_comments','author_id'),
      ('posts','user_id'), ('comments','user_id'), ('payments','user_id')
    ) as t(tbl, col)
  loop
    continue when to_regclass('public.' || p.tbl) is null;
    continue when exists (
      select 1 from pg_constraint c
      where c.contype = 'f' and c.conrelid = ('public.' || p.tbl)::regclass
        and c.confrelid = 'public.profiles'::regclass
        and c.conkey = array[(select attnum from pg_attribute where attrelid = c.conrelid and attname = p.col)]
    );
    begin
      execute format('alter table public.%I add constraint %I foreign key (%I) references public.profiles(id) on delete cascade not valid',
                     p.tbl, p.tbl || '_' || p.col || '_profiles_fkey', p.col);
      begin
        execute format('alter table public.%I validate constraint %I', p.tbl, p.tbl || '_' || p.col || '_profiles_fkey');
      exception when others then
        raise notice 'FK % left NOT VALID: %', p.tbl, sqlerrm;
      end;
    exception when others then
      raise notice 'skip FK on %.%: %', p.tbl, p.col, sqlerrm;
    end;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Medee: authors and admins can edit/delete their posts and comments (UPDATE rules were missing entirely).
-- Classes: teachers can manage their own classes; every class teacher is also a member.

drop policy if exists "medee update own or admin" on public.medee_posts;
create policy "medee update own or admin" on public.medee_posts for update
  using (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')))
  with check (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

drop policy if exists "medee delete admin" on public.medee_posts;
create policy "medee delete admin" on public.medee_posts for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

drop policy if exists "comment update own or admin" on public.medee_comments;
create policy "comment update own or admin" on public.medee_comments for update
  using (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')))
  with check (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

drop policy if exists "comment delete admin" on public.medee_comments;
create policy "comment delete admin" on public.medee_comments for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

drop policy if exists "Teachers insert own classes" on public.classes;
create policy "Teachers insert own classes" on public.classes for insert
  with check (teacher_id = auth.uid());

drop policy if exists "Teachers update own classes" on public.classes;
create policy "Teachers update own classes" on public.classes for update
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "Teachers read own classes" on public.classes;
create policy "Teachers read own classes" on public.classes for select
  using (teacher_id = auth.uid());

-- backfill: each class's teacher becomes a member (fixes "my private class is invisible")
insert into public.class_members (class_id, user_id, role)
select c.id, c.teacher_id, 'teacher' from public.classes c
where c.teacher_id is not null
  and exists (select 1 from public.profiles p where p.id = c.teacher_id)
  and not exists (select 1 from public.class_members m where m.class_id = c.id and m.user_id = c.teacher_id);

notify pgrst, 'reload schema';

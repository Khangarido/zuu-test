-- Private classes: paid / invited / hand-added membership with expiry, admin-set price and access period,
-- student codes, and member-only reads. Safe to re-run.

-- ── classes: price + access period (admin-edited) ──────────────────────────────────────
alter table public.classes add column if not exists price integer not null default 0;
alter table public.classes add column if not exists access_mode text not null default 'duration';
alter table public.classes add column if not exists access_end_date timestamptz;
alter table public.classes add column if not exists access_days integer not null default 30;
alter table public.classes add column if not exists byl_price_id integer;
alter table public.classes add column if not exists invite_token text;
update public.classes set invite_token = replace(gen_random_uuid()::text, '-', '') where invite_token is null;
alter table public.classes alter column invite_token set default replace(gen_random_uuid()::text, '-', '');
create unique index if not exists classes_invite_token_key on public.classes (invite_token);
do $$ begin
  alter table public.classes add constraint classes_access_mode_check check (access_mode in ('duration','fixed_date'));
exception when duplicate_object then null; end $$;

-- ── memberships: expiry + how they got in ─────────────────────────────────────────────
alter table public.class_members add column if not exists expires_at timestamptz;
alter table public.class_members add column if not exists source text;
alter table public.class_members add column if not exists added_by uuid;

-- ── helpers (security definer so policies can use them without recursion) ──────────────
create or replace function public.is_admin_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin'));
$$;

create or replace function public.is_class_teacher(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = cid and c.teacher_id = auth.uid())
      or exists (select 1 from public.class_members m where m.class_id = cid and m.user_id = auth.uid() and m.role = 'teacher');
$$;

create or replace function public.is_class_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin_user() or public.is_class_teacher(cid) or exists (
    select 1 from public.class_members m
    where m.class_id = cid and m.user_id = auth.uid() and (m.expires_at is null or m.expires_at > now()));
$$;

-- ── payments can be for a class ───────────────────────────────────────────────────────
alter table public.payments add column if not exists class_id uuid;
do $$ begin
  alter table public.payments alter column exam_set_id drop not null;
exception when others then raise notice 'payments.exam_set_id: %', sqlerrm; end $$;

-- ── student codes (6 chars) so teachers can add students by hand ──────────────────────
alter table public.profiles add column if not exists student_code text;
create or replace function public.gen_student_code() returns text language plpgsql as $$
declare chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; code text; i int;
begin
  loop
    code := '';
    for i in 1..6 loop code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
    exit when not exists (select 1 from public.profiles where student_code = code);
  end loop;
  return code;
end $$;
update public.profiles set student_code = public.gen_student_code() where student_code is null;
create unique index if not exists profiles_student_code_key on public.profiles (student_code);
create or replace function public.profiles_set_student_code() returns trigger language plpgsql as $$
begin
  if new.student_code is null then new.student_code := public.gen_student_code(); end if;
  return new;
end $$;
drop trigger if exists profiles_student_code_trg on public.profiles;
create trigger profiles_student_code_trg before insert on public.profiles
  for each row execute function public.profiles_set_student_code();

-- ── class_members: nobody can add themselves into a class any more ───────────────────
drop policy if exists "Users manage own membership" on public.class_members;
drop policy if exists "member insert" on public.class_members;
drop policy if exists "Anyone can view memberships" on public.class_members;
drop policy if exists "member read" on public.class_members;

drop policy if exists "members read own or teacher" on public.class_members;
create policy "members read own or teacher" on public.class_members for select
  using (user_id = auth.uid() or public.is_class_teacher(class_id) or public.is_admin_user());

-- the creator may register themself as the teacher of a class they own (class creation page)
drop policy if exists "teacher self membership" on public.class_members;
create policy "teacher self membership" on public.class_members for insert
  with check (user_id = auth.uid() and role = 'teacher'
              and exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));
-- (leaving a class keeps the existing "member delete" policy; joins/adds/payments go through the server)

-- ── class posts and class exams: readable only by active members ─────────────────────
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('class_posts','class_exams') and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;
drop policy if exists "class posts members only" on public.class_posts;
create policy "class posts members only" on public.class_posts for select using (public.is_class_member(class_id));
drop policy if exists "class exams members only" on public.class_exams;
create policy "class exams members only" on public.class_exams for select using (public.is_class_member(class_id));

notify pgrst, 'reload schema';

-- ─── Enable RLS on all tables ────────────────────────────────────────────────
alter table profiles        enable row level security;
alter table exam_sets       enable row level security;
alter table questions       enable row level security;
alter table answer_options  enable row level security;
alter table attempts        enable row level security;
alter table attempt_answers enable row level security;
alter table access          enable row level security;
alter table payments        enable row level security;

-- ─── profiles ────────────────────────────────────────────────────────────────
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- ─── exam_sets ───────────────────────────────────────────────────────────────
create policy "Anyone authenticated can view active exam sets"
  on exam_sets for select
  to authenticated
  using (is_active = true);

-- ─── questions ───────────────────────────────────────────────────────────────
create policy "Authenticated users can view questions"
  on questions for select
  to authenticated
  using (true);

-- ─── answer_options ──────────────────────────────────────────────────────────
create policy "Authenticated users can view answer options"
  on answer_options for select
  to authenticated
  using (true);

-- ─── attempts ────────────────────────────────────────────────────────────────
create policy "Users can view own attempts"
  on attempts for select using (auth.uid() = user_id);

create policy "Users can insert own attempts"
  on attempts for insert with check (auth.uid() = user_id);

create policy "Users can update own attempts"
  on attempts for update using (auth.uid() = user_id);

-- ─── attempt_answers ─────────────────────────────────────────────────────────
create policy "Users can view own answers"
  on attempt_answers for select
  using (
    attempt_id in (select id from attempts where user_id = auth.uid())
  );

create policy "Users can insert own answers"
  on attempt_answers for insert
  with check (
    attempt_id in (select id from attempts where user_id = auth.uid())
  );

create policy "Users can update own answers"
  on attempt_answers for update
  using (
    attempt_id in (select id from attempts where user_id = auth.uid())
  );

-- ─── access ──────────────────────────────────────────────────────────────────
create policy "Users can view own access"
  on access for select using (auth.uid() = user_id);

create policy "Users can insert own access"
  on access for insert with check (auth.uid() = user_id);

-- ─── payments ────────────────────────────────────────────────────────────────
create policy "Users can view own payments"
  on payments for select using (auth.uid() = user_id);

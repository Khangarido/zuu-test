-- ═══════════════════════════════════════════════════════════════
-- Run this entire script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add new columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username    text unique;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subjects    text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank_score  numeric default 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank_tier   text default 'Bronze';

-- first_name, last_name, avatar_url, grade already added by profile_fields.sql
-- (safe to re-run due to IF NOT EXISTS)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name   text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade       text;

-- 2. Expand role enum to include superadmin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'admin', 'superadmin'));

-- 3. Updated trigger — reads username, grade, subjects from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, first_name, last_name,
    username, grade, subjects, avatar_url,
    sex, age, aimag, sum_district,
    phone, school, receive_emails, role,
    rank_score, rank_tier
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    LOWER(TRIM(NEW.raw_user_meta_data->>'username')),
    NEW.raw_user_meta_data->>'grade',
    CASE
      WHEN NEW.raw_user_meta_data ? 'subjects'
        THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'subjects'))
      ELSE ARRAY[]::text[]
    END,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'sex',
    (NEW.raw_user_meta_data->>'age')::integer,
    NEW.raw_user_meta_data->>'aimag',
    NEW.raw_user_meta_data->>'sum_district',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'school',
    COALESCE((NEW.raw_user_meta_data->>'receive_emails')::boolean, false),
    'student',
    0,
    'Bronze'
  )
  ON CONFLICT (id) DO UPDATE SET
    email          = EXCLUDED.email,
    full_name      = EXCLUDED.full_name,
    first_name     = EXCLUDED.first_name,
    last_name      = EXCLUDED.last_name,
    sex            = EXCLUDED.sex,
    age            = EXCLUDED.age,
    aimag          = EXCLUDED.aimag,
    sum_district   = EXCLUDED.sum_district,
    phone          = EXCLUDED.phone,
    school         = EXCLUDED.school,
    grade          = EXCLUDED.grade,
    receive_emails = EXCLUDED.receive_emails;
  RETURN NEW;
END;
$$;

-- Ensure trigger is attached (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Index for username lookups (used by /api/check-username and profile pages)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username)
  WHERE username IS NOT NULL;

-- 5. Index for leaderboard sort
CREATE INDEX IF NOT EXISTS profiles_rank_score_idx ON profiles (rank_score DESC)
  WHERE role = 'student';

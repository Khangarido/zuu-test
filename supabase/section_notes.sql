-- Adds an optional explanation / instruction text for a section of a test, shown to students above
-- the questions of that section (together with questions.section_name, which already exists).
--
-- Run ONCE on the database BEFORE deploying the code that reads this column:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 -f - < supabase/section_notes.sql
--
-- Safe to re-run. Rolling the code back later is harmless: an unused column does nothing.
-- question_type ('multiple_choice' | 'fill_in') and correct_answer already exist.

alter table public.questions add column if not exists section_note text;

-- PostgREST caches the table shape; tell it to reload so the new column is usable immediately.
notify pgrst, 'reload schema';

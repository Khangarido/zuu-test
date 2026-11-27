-- Adds an optional explanation / instruction text for a section of a test, shown to students above
-- the questions of that section (together with questions.section_name, which already exists).
--
-- Applied automatically, once, by deploy/scripts/migrate.sh during every deploy (it records the file
-- name in app_private.migrations). Written to be safe to re-run and to keep the PREVIOUS version of
-- the app working, so a failed deploy can roll back: additive changes only (new nullable columns/tables).
-- question_type ('multiple_choice' | 'fill_in') and correct_answer already exist.

alter table public.questions add column if not exists section_note text;

-- PostgREST caches the table shape; tell it to reload so the new column is usable immediately.
notify pgrst, 'reload schema';

import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export class ExamStartError extends Error {
  code: "NOT_FOUND" | "NO_ACCESS" | "ALREADY_SUBMITTED"
  attemptId?: string

  constructor(code: "NOT_FOUND" | "NO_ACCESS" | "ALREADY_SUBMITTED", message: string, attemptId?: string) {
    super(message)
    this.code = code
    this.attemptId = attemptId
  }
}

type AttemptRow = {
  id: string
  started_at: string
  status: "in_progress" | "submitted"
}

type ExamSetRow = {
  id: string
  title: string
  duration_minutes: number
  price: number
  is_active: boolean
  shuffle_questions: boolean
  subject_id: string | null
}

/** Auto-submit an expired in-progress attempt and compute the score. */
async function autoSubmitExpiredAttempt(attemptId: string, examSetId: string) {
  const admin = getSupabaseAdmin()
  const { data: questions } = await admin
    .from("questions")
    .select("id, question_type, correct_answer, answer_options(id, is_correct)")
    .eq("exam_set_id", examSetId)

  const { data: answers } = await admin
    .from("attempt_answers")
    .select("question_id, selected_option_id, text_answer")
    .eq("attempt_id", attemptId)

  const optionMap: Record<string, string | null> = {}
  const textMap: Record<string, string | null> = {}
  for (const a of answers ?? []) {
    optionMap[a.question_id] = a.selected_option_id
    textMap[a.question_id] = a.text_answer ?? null
  }

  const total = (questions ?? []).length
  let correct = 0
  for (const q of questions ?? []) {
    if (q.question_type === "fill_in") {
      const student = (textMap[q.id] ?? "").trim().toLowerCase()
      const answer = (q.correct_answer ?? "").trim().toLowerCase()
      if (student && answer && student === answer) correct++
    } else {
      const opts = Array.isArray(q.answer_options) ? q.answer_options : []
      const correctOpt = (opts as Array<{ id: string; is_correct: boolean }>).find((o) => o.is_correct)
      if (correctOpt && optionMap[q.id] === correctOpt.id) correct++
    }
  }

  const scorePercentage = total > 0 ? (correct / total) * 100 : 0
  await admin.from("attempts").update({
    status: "submitted",
    submitted_at: new Date().toISOString(),
    score_percentage: scorePercentage,
    correct_count: correct,
    total_count: total,
  }).eq("id", attemptId)
}

export async function startOrResumeAttempt(
  examSetId: string,
  userId: string,
  options?: { forceNew?: boolean }
) {
  const supabase = await createClient()

  const { data: examSet, error: examSetError } = await supabase
    .from("exam_sets")
    .select("id, title, duration_minutes, price, is_active, shuffle_questions, subject_id")
    .eq("id", examSetId)
    .maybeSingle()

  if (examSetError) throw new Error(examSetError.message)
  if (!examSet || !examSet.is_active) {
    throw new ExamStartError("NOT_FOUND", "Шалгалтын багц олдсонгүй.")
  }

  const typedExamSet = examSet as ExamSetRow

  const { data: accessRow, error: accessError } = await supabase
    .from("access")
    .select("id")
    .eq("user_id", userId)
    .eq("exam_set_id", examSetId)
    .maybeSingle()

  if (accessError) throw new Error(accessError.message)

  if (!accessRow) {
    if (typedExamSet.price === 0) {
      const { error: grantError } = await supabase
        .from("access")
        .insert({ user_id: userId, exam_set_id: examSetId })
      if (grantError) throw new Error(grantError.message)
    } else {
      throw new ExamStartError("NO_ACCESS", "Энэ шалгалтад эрхгүй байна.")
    }
  }

  const admin = getSupabaseAdmin()
  const { data: existingAttempt, error: attemptError } = await admin
    .from("attempts")
    .select("id, started_at, status")
    .eq("user_id", userId)
    .eq("exam_set_id", examSetId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (attemptError) throw new Error(attemptError.message)

  if (existingAttempt) {
    const typedAttempt = existingAttempt as AttemptRow

    if (typedAttempt.status === "submitted") {
      if (!options?.forceNew) {
        throw new ExamStartError(
          "ALREADY_SUBMITTED",
          "Та энэ шалгалтыг аль хэдийн дуусгасан байна.",
          typedAttempt.id
        )
      }
      // forceNew=true: reset the existing attempt in-place (avoids unique constraint issues)
      const nowIso = new Date().toISOString()
      const { error: resetError } = await admin
        .from("attempts")
        .update({
          status: "in_progress",
          started_at: nowIso,
          submitted_at: null,
          score_percentage: null,
          correct_count: null,
          total_count: null,
          tab_switch_count: 0,
        })
        .eq("id", typedAttempt.id)
      if (resetError) throw new Error(resetError.message)

      // Clear previous answers so the retake starts fresh
      await admin.from("attempt_answers").delete().eq("attempt_id", typedAttempt.id)

      return {
        examSet: typedExamSet,
        attempt: { id: typedAttempt.id, started_at: nowIso, status: "in_progress" } as AttemptRow,
      }
    } else {
      // in_progress: check server-side if time has expired
      const durationMs = (typedExamSet.duration_minutes || 90) * 60_000
      const elapsedMs = Date.now() - new Date(typedAttempt.started_at).getTime()
      if (elapsedMs > durationMs) {
        await autoSubmitExpiredAttempt(typedAttempt.id, examSetId)
        throw new ExamStartError(
          "ALREADY_SUBMITTED",
          "Шалгалтын хугацаа дууссан байна.",
          typedAttempt.id
        )
      }
      return { examSet: typedExamSet, attempt: typedAttempt }
    }
  }

  // No existing attempt — create a fresh one
  const { data: insertedAttempt, error: insertAttemptError } = await admin
    .from("attempts")
    .insert({ user_id: userId, exam_set_id: examSetId, status: "in_progress" })
    .select("id, started_at, status")
    .maybeSingle()

  if (insertAttemptError || !insertedAttempt) {
    throw new Error(insertAttemptError?.message ?? "Шалгалт эхлүүлэх үед алдаа гарлаа.")
  }

  return { examSet: typedExamSet, attempt: insertedAttempt as AttemptRow }
}

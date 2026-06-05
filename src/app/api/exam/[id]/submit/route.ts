import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { updateRankScore } from "@/lib/ranking"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts").select("id, user_id, status, exam_set_id").eq("id", id).maybeSingle()

  if (attemptError) return NextResponse.json({ error: attemptError.message }, { status: 400 })
  if (!attempt || attempt.user_id !== user.id) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  if (attempt.status === "submitted") return NextResponse.json({ ok: true, attempt_id: attempt.id })

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_type, correct_answer, points, answer_options(id, is_correct)")
    .eq("exam_set_id", attempt.exam_set_id)

  if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 400 })

  const { data: answers, error: answersError } = await supabase
    .from("attempt_answers")
    .select("question_id, selected_option_id, text_answer")
    .eq("attempt_id", id)

  if (answersError) return NextResponse.json({ error: answersError.message }, { status: 400 })

  const optionAnswerMap: Record<string, string | null> = {}
  const textAnswerMap: Record<string, string | null> = {}
  for (const a of answers ?? []) {
    optionAnswerMap[a.question_id] = a.selected_option_id
    textAnswerMap[a.question_id] = a.text_answer ?? null
  }

  const total = (questions ?? []).length
  let correct = 0
  let earnedPoints = 0
  let totalPoints = 0

  for (const q of questions ?? []) {
    const pts = (q as any).points ?? 1
    totalPoints += pts
    let isCorrect = false
    if (q.question_type === "fill_in") {
      const studentAnswer = (textAnswerMap[q.id] ?? "").trim().toLowerCase()
      const correctAnswer = (q.correct_answer ?? "").trim().toLowerCase()
      if (studentAnswer && correctAnswer && studentAnswer === correctAnswer) isCorrect = true
    } else {
      const opts = Array.isArray(q.answer_options) ? q.answer_options : []
      const correctOpt = (opts as Array<{ id: string; is_correct: boolean }>).find((o) => o.is_correct)
      if (correctOpt && optionAnswerMap[q.id] === correctOpt.id) isCorrect = true
    }
    if (isCorrect) { correct++; earnedPoints += pts }
  }

  const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

  const { error: updateError } = await supabase.from("attempts").update({
    status: "submitted",
    submitted_at: new Date().toISOString(),
    score_percentage: scorePercentage,
    correct_count: correct,
    total_count: total,
    earned_points: earnedPoints,
    total_points: totalPoints,
  }).eq("id", id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  // Fire-and-forget: rank update + EXP grant + notification
  ;(async () => {
    await updateRankScore(user.id)

    const expEarned = 50 + Math.round(scorePercentage * 2)
    const admin = getSupabaseAdmin()

    // Atomic-safe read+increment for exp_points
    const { data: prof } = await admin
      .from("profiles")
      .select("exp_points")
      .eq("id", user.id)
      .maybeSingle()
    const newExp = ((prof?.exp_points as number | null) ?? 0) + expEarned
    await admin.from("profiles").update({ exp_points: newExp }).eq("id", user.id)

    // Fetch exam title for notification body
    const { data: examSet } = await admin
      .from("exam_sets")
      .select("title")
      .eq("id", attempt.exam_set_id)
      .maybeSingle()

    await admin.from("notifications").insert({
      user_id: user.id,
      type: "exp_earned",
      title: `+${expEarned} XP авлаа!`,
      body: (examSet?.title as string | null) ?? "Шалгалт дууслаа",
      link: "/dashboard",
    })
  })().catch(() => {})

  return NextResponse.json({ ok: true, attempt_id: id })
}

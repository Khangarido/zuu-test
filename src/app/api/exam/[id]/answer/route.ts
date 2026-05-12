import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Body = {
  question_id: string
  selected_option_id?: string | null
  text_answer?: string | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = (await request.json()) as Body

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select("id, user_id, status, started_at, exam_set:exam_sets(duration_minutes)")
    .eq("id", id)
    .maybeSingle()

  if (attemptError) return NextResponse.json({ error: attemptError.message }, { status: 400 })
  if (!attempt || attempt.user_id !== user.id) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  if (attempt.status !== "in_progress") return NextResponse.json({ error: "ATTEMPT_NOT_ACTIVE" }, { status: 409 })

  const examSetJoin = attempt.exam_set as { duration_minutes: number } | Array<{ duration_minutes: number }> | null
  const durationMinutes = Array.isArray(examSetJoin) ? examSetJoin[0]?.duration_minutes ?? 0 : examSetJoin?.duration_minutes ?? 0
  const elapsedMs = Date.now() - new Date(attempt.started_at).getTime()
  if (elapsedMs > durationMinutes * 60_000) return NextResponse.json({ error: "TIME_EXCEEDED" }, { status: 409 })

  if (!body.question_id) return NextResponse.json({ error: "question_id шаардлагатай." }, { status: 400 })

  const { error: upsertError } = await supabase.from("attempt_answers").upsert(
    {
      attempt_id: id,
      question_id: body.question_id,
      selected_option_id: body.selected_option_id ?? null,
      text_answer: body.text_answer ?? null,
    },
    { onConflict: "attempt_id,question_id" }
  )

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

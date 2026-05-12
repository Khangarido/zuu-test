import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ExamStartError, startOrResumeAttempt } from "@/lib/exam/start"
import { ExamClient } from "./_client"

type QuestionRow = {
  id: string
  question_text: string
  image_url: string | null
  question_type: string | null
  topic_id: string | null
  order_index: number
  created_at: string
  answer_options: Array<{
    id: string
    option_label: "A" | "B" | "C" | "D" | "E"
    option_text: string
    image_url?: string | null
  }> | null
}

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ examSetId: string }>
  searchParams: Promise<{ retake?: string }>
}) {
  const { examSetId } = await params
  const { retake } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let started
  try {
    started = await startOrResumeAttempt(examSetId, user.id, { forceNew: retake === "1" })
  } catch (error) {
    if (error instanceof ExamStartError) {
      if (error.code === "NO_ACCESS") redirect("/dashboard?toast=NO_ACCESS")
      if (error.code === "ALREADY_SUBMITTED" && error.attemptId) redirect(`/results/${error.attemptId}`)
      redirect("/dashboard")
    }
    throw error
  }

  const { attempt, examSet } = started

  const { data: questionRows, error: questionError } = await supabase
    .from("questions")
    .select("id, question_text, image_url, question_type, topic_id, order_index, created_at, answer_options(id, option_label, option_text, image_url)")
    .eq("exam_set_id", examSetId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true })

  if (questionError) throw new Error(questionError.message)

  // Always display questions in order_index order — no shuffle.
  const questions = (questionRows ?? []) as QuestionRow[]

  const { data: savedAnswers, error: answersError } = await supabase
    .from("attempt_answers")
    .select("question_id, selected_option_id, text_answer")
    .eq("attempt_id", attempt.id)

  if (answersError) throw new Error(answersError.message)

  const prefilledAnswers: Record<string, string> = {}
  for (const row of savedAnswers ?? []) {
    if (row.selected_option_id) prefilledAnswers[row.question_id] = row.selected_option_id
    else if (row.text_answer) prefilledAnswers[row.question_id] = row.text_answer
  }

  return (
    <ExamClient
      attempt={{ id: attempt.id, started_at: attempt.started_at }}
      durationMinutes={examSet.duration_minutes || 90}
      serverTime={new Date().toISOString()}
      examTitle={examSet.title}
      questions={questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        image_url: q.image_url ?? null,
        question_type: (q.question_type ?? "multiple_choice") as "multiple_choice" | "fill_in",
        order_index: q.order_index,
        answer_options: (q.answer_options ?? []).map((o) => ({ ...o, image_url: o.image_url ?? null })),
      }))}
      prefilledAnswers={prefilledAnswers}
    />
  )
}

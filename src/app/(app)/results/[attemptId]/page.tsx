import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MathText } from "@/components/math-text"
import { CheckCircle2, XCircle, RotateCcw, ArrowLeft, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type AnswerOption = {
  id: string
  option_label: "A" | "B" | "C" | "D" | "E"
  option_text: string
  is_correct: boolean
  image_url: string | null
}

type QuestionResult = {
  id: string
  question_text: string
  image_url: string | null
  question_type: "multiple_choice" | "fill_in"
  correct_answer: string | null
  explanation: string | null
  topic_name: string | null
  answer_options: AnswerOption[]
  selected_option_id: string | null
  text_answer: string | null
  is_correct: boolean
}

type TopicStat = { topic_name: string; correct: number; total: number }

const cyrillicLabel: Record<"A" | "B" | "C" | "D" | "E", string> = {
  A: "А", B: "Б", C: "В", D: "Г", E: "Д",
}

function ScoreRing({ percent }: { percent: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100)
  const color =
    percent >= 70 ? "#10b981" : percent >= 40 ? "#f59e0b" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="140"
        height="140"
        viewBox="0 0 120 120"
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-muted"
        />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {percent.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle()

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select(
      "id, user_id, status, score_percentage, correct_count, total_count, submitted_at, exam_set:exam_sets(id, title)"
    )
    .eq("id", attemptId)
    .maybeSingle()

  if (attemptError || !attempt || attempt.user_id !== user.id) redirect("/dashboard")
  if (attempt.status !== "submitted") {
    const es = attempt.exam_set as unknown as { id: string } | null
    if (es?.id) redirect(`/exam/${es.id}`)
    redirect("/dashboard")
  }

  const examSet = attempt.exam_set as unknown as { id: string; title: string } | null

  const { data: questions } = await supabase
    .from("questions")
    .select(
      "id, question_text, image_url, question_type, correct_answer, explanation, topic_id, topics(name), answer_options(id, option_label, option_text, is_correct, image_url)"
    )
    .eq("exam_set_id", examSet?.id ?? "")
    .order("order_index", { ascending: true })

  const { data: savedAnswers } = await supabase
    .from("attempt_answers")
    .select("question_id, selected_option_id, text_answer")
    .eq("attempt_id", attemptId)

  const optionAnswerMap: Record<string, string | null> = {}
  const textAnswerMap: Record<string, string | null> = {}
  for (const a of savedAnswers ?? []) {
    optionAnswerMap[a.question_id] = a.selected_option_id
    textAnswerMap[a.question_id] = a.text_answer ?? null
  }

  const questionResults: QuestionResult[] = (questions ?? []).map((q) => {
    const options = (Array.isArray(q.answer_options) ? q.answer_options : []) as AnswerOption[]
    const qType = (q.question_type ?? "multiple_choice") as "multiple_choice" | "fill_in"
    const topicRaw = q.topics
    const topicName =
      Array.isArray(topicRaw)
        ? (topicRaw[0]?.name ?? null)
        : ((topicRaw as { name: string } | null)?.name ?? null)
    const selectedId = optionAnswerMap[q.id] ?? null
    const textAnswer = textAnswerMap[q.id] ?? null
    const correctOption = options.find((o) => o.is_correct)

    let isCorrect = false
    if (qType === "fill_in") {
      const studentAns = (textAnswer ?? "").trim().toLowerCase()
      const correctAns = (
        (q as { correct_answer?: string | null }).correct_answer ?? ""
      )
        .trim()
        .toLowerCase()
      isCorrect = !!studentAns && !!correctAns && studentAns === correctAns
    } else {
      isCorrect = !!correctOption && selectedId === correctOption.id
    }

    return {
      id: q.id,
      question_text: q.question_text,
      image_url: (q as { image_url?: string | null }).image_url ?? null,
      question_type: qType,
      correct_answer: (q as { correct_answer?: string | null }).correct_answer ?? null,
      explanation: q.explanation,
      topic_name: topicName,
      answer_options: options.sort(
        (a, b) =>
          ["A", "B", "C", "D", "E"].indexOf(a.option_label) -
          ["A", "B", "C", "D", "E"].indexOf(b.option_label)
      ),
      selected_option_id: selectedId,
      text_answer: textAnswer,
      is_correct: isCorrect,
    }
  })

  const topicMap: Record<string, TopicStat> = {}
  for (const qr of questionResults) {
    const key = qr.topic_name ?? "Сэдэвгүй"
    if (!topicMap[key]) topicMap[key] = { topic_name: key, correct: 0, total: 0 }
    topicMap[key].total++
    if (qr.is_correct) topicMap[key].correct++
  }
  const topicStats = Object.values(topicMap).sort(
    (a, b) => a.correct / a.total - b.correct / b.total
  )

  const scorePercent = attempt.score_percentage ?? 0
  const correct = attempt.correct_count ?? 0
  const total = attempt.total_count ?? questionResults.length
  const fullName = profile?.full_name ?? ""
  const role = profile?.role === "admin" ? "admin" : "student"

  const scoreLabel =
    scorePercent >= 70
      ? "Маш сайн!"
      : scorePercent >= 40
        ? "Дунд зэрэг"
        : "Илүү хичээх хэрэгтэй"

  const scoreLabelColor =
    scorePercent >= 70
      ? "text-emerald-600 dark:text-emerald-400"
      : scorePercent >= 40
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"

  return (
    <AppShell
      fullName={fullName}
      email={user.email ?? ""}
      role={role}
      isAdmin={role === "admin"}
    >
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Шалгалтын үр дүн</h1>
            <p className="text-muted-foreground mt-0.5">{examSet?.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="cursor-pointer">
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
                Буцах
              </Link>
            </Button>
            {examSet?.id && (
              <Button size="sm" asChild className="cursor-pointer">
                <Link href={`/exam/${examSet.id}?retake=1`}>
                  <RotateCcw className="size-4" />
                  Дахин өгөх
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Score card */}
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
              {/* Ring */}
              <div className="flex flex-col items-center gap-2">
                <ScoreRing percent={scorePercent} />
                <p className={cn("text-sm font-semibold", scoreLabelColor)}>
                  {scoreLabel}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-1 sm:gap-6 text-center sm:text-left">
                <div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {correct}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">Зөв хариулт</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-500">
                    {total - correct}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">Буруу хариулт</p>
                </div>
                <div>
                  <div className="text-3xl font-bold">{total}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">Нийт асуулт</p>
                </div>
                {attempt.submitted_at && (
                  <div>
                    <div className="text-sm font-semibold">
                      {new Date(attempt.submitted_at).toLocaleDateString("mn-MN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">Огноо</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Topic breakdown */}
        {topicStats.length > 0 && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Сэдвээр задаргаа</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topicStats.map((stat) => {
                const pct = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0
                const barColor =
                  pct >= 70
                    ? "bg-emerald-500"
                    : pct >= 40
                      ? "bg-amber-500"
                      : "bg-red-500"
                const labelColor =
                  pct >= 70
                    ? "text-emerald-600 dark:text-emerald-400"
                    : pct >= 40
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                return (
                  <div key={stat.topic_name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stat.topic_name}</span>
                      <span className={cn("font-semibold tabular-nums", labelColor)}>
                        {stat.correct}/{stat.total} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", barColor)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Question review */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Асуулт бүрийн шинжилгээ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questionResults.map((qr, index) => (
              <div
                key={qr.id}
                className={cn(
                  "rounded-xl border p-4 space-y-3 transition-colors",
                  qr.is_correct
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                    : "border-red-200 bg-red-50/60 dark:border-red-800/50 dark:bg-red-950/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {qr.is_correct ? (
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="size-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                        {index + 1}.
                      </span>
                      <div className="text-sm font-medium leading-relaxed">
                        <MathText text={qr.question_text} />
                      </div>
                      {qr.question_type === "fill_in" && (
                        <Badge variant="outline" className="text-xs shrink-0">Бичгийн</Badge>
                      )}
                    </div>
                    {qr.image_url && (
                      <img
                        src={qr.image_url}
                        alt="Асуултын зураг"
                        className="max-h-48 rounded-lg border object-contain bg-muted"
                      />
                    )}
                  </div>
                </div>

                {qr.question_type === "fill_in" ? (
                  <div className="pl-8 space-y-1.5 text-sm">
                    <div
                      className={cn(
                        "rounded-lg border px-3 py-2",
                        qr.is_correct
                          ? "border-emerald-400 bg-emerald-100 dark:bg-emerald-900/40"
                          : "border-red-400 bg-red-100 dark:bg-red-900/40"
                      )}
                    >
                      <span className="text-muted-foreground">Таны хариулт: </span>
                      <span className="font-medium">{qr.text_answer || "—"}</span>
                      {qr.is_correct && (
                        <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          Зөв
                        </span>
                      )}
                    </div>
                    {!qr.is_correct && qr.correct_answer && (
                      <div className="rounded-lg border border-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-3 py-2">
                        <span className="text-muted-foreground">Зөв хариулт: </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {qr.correct_answer}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 pl-8">
                    {qr.answer_options.map((opt) => {
                      const isSelected = qr.selected_option_id === opt.id
                      const isCorrect = opt.is_correct
                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            "flex items-start gap-2.5 text-sm px-3 py-2 rounded-lg border transition-colors",
                            isCorrect
                              ? "border-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 font-medium"
                              : isSelected
                                ? "border-red-400 bg-red-100 dark:bg-red-900/40 text-muted-foreground line-through"
                                : "border-transparent text-muted-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                              isCorrect
                                ? "bg-emerald-500 text-white"
                                : isSelected
                                  ? "bg-red-400 text-white"
                                  : "bg-muted"
                            )}
                          >
                            {cyrillicLabel[opt.option_label]}
                          </span>
                          <div className="flex-1 pt-0.5">
                            <MathText text={opt.option_text} />
                            {opt.image_url && (
                              <img
                                src={opt.image_url}
                                alt={`Сонголт ${cyrillicLabel[opt.option_label]}`}
                                className="mt-1 max-h-24 rounded border object-contain bg-muted"
                              />
                            )}
                          </div>
                          {isCorrect && (
                            <CheckCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                          )}
                          {isSelected && !isCorrect && (
                            <span className="shrink-0 text-xs text-red-500 mt-0.5 font-medium">
                              Таны
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {qr.explanation && (
                  <div className="pl-8 text-sm rounded-lg bg-background/60 border border-border/50 px-3 py-2">
                    <span className="font-semibold text-foreground">Тайлбар: </span>
                    <span className="text-muted-foreground">
                      <MathText text={qr.explanation} />
                    </span>
                  </div>
                )}

                {qr.topic_name && (
                  <div className="pl-8">
                    <Badge variant="outline" className="text-xs">
                      {qr.topic_name}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

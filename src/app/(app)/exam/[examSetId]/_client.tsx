"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MathText } from "@/components/math-text"
import { ChevronLeft, ChevronRight, Send, Timer } from "lucide-react"
import { cn } from "@/lib/utils"

type Option = {
  id: string
  option_label: "A" | "B" | "C" | "D" | "E"
  option_text: string
  image_url: string | null
}

type Question = {
  id: string
  question_text: string
  image_url: string | null
  question_type: "multiple_choice" | "fill_in"
  order_index: number
  answer_options: Option[]
}

const cyrillicLabel: Record<"A" | "B" | "C" | "D" | "E", string> = {
  A: "А", B: "Б", C: "В", D: "Г", E: "Д",
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function ExamClient({
  attempt, durationMinutes, serverTime, questions, prefilledAnswers, examTitle,
}: {
  attempt: { id: string; started_at: string }
  durationMinutes: number
  serverTime: string
  questions: Question[]
  prefilledAnswers: Record<string, string>
  examTitle: string
}) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(prefilledAnswers)
  const [remainingMs, setRemainingMs] = useState(durationMinutes * 60_000)
  const [submitting, startSubmitting] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const autoSubmittingRef = useRef(false)
  const fillInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerWasPositiveRef = useRef(false)

  const localTimeAtLoad = useRef(Date.now())
  const serverTimeAtLoad = useRef(new Date(serverTime).getTime())
  const startedAtMs = useRef(new Date(attempt.started_at).getTime())

  useEffect(() => {
    const tick = () => {
      const elapsed =
        Date.now() - localTimeAtLoad.current +
        (serverTimeAtLoad.current - startedAtMs.current)
      const remaining = durationMinutes * 60_000 - elapsed
      setRemainingMs(remaining)
      if (remaining > 0) timerWasPositiveRef.current = true
      if (remaining <= 0 && timerWasPositiveRef.current && !autoSubmittingRef.current) {
        autoSubmittingRef.current = true
        void submitExam()
      }
    }
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [durationMinutes])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = "Шалгалт өгөдөж байна. Гарвал даалгавар алдагдана."
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  const currentQuestion = questions[currentIndex]
  const answeredCount = useMemo(
    () => questions.filter((q) => Boolean(answers[q.id]?.trim())).length,
    [answers, questions]
  )

  const sortedOptions = useMemo(() => {
    if (!currentQuestion || currentQuestion.question_type === "fill_in") return []
    const order = ["A", "B", "C", "D", "E"]
    return [...currentQuestion.answer_options].sort(
      (a, b) => order.indexOf(a.option_label) - order.indexOf(b.option_label)
    )
  }, [currentQuestion])

  const saveAnswer = useCallback(
    (questionId: string, payload: { selected_option_id?: string; text_answer?: string }) => {
      void fetch(`/api/exam/${attempt.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, ...payload }),
      }).then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          toast.error(data.error ?? "Хариулт хадгалах үед алдаа гарлаа.")
        }
      })
    },
    [attempt.id]
  )

  const selectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    saveAnswer(questionId, { selected_option_id: optionId })
  }

  const handleFillInChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    if (fillInTimerRef.current) clearTimeout(fillInTimerRef.current)
    fillInTimerRef.current = setTimeout(() => {
      saveAnswer(questionId, { text_answer: value })
    }, 800)
  }

  const submitExam = async () => {
    const response = await fetch(`/api/exam/${attempt.id}/submit`, { method: "POST" })
    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean; error?: string; attempt_id?: string
    }
    if (!response.ok || !data.ok) {
      toast.error(data.error ?? "Шалгалтыг дуусгах үед алдаа гарлаа.")
      autoSubmittingRef.current = false
      return
    }
    router.replace(`/results/${data.attempt_id ?? attempt.id}`)
  }

  const handleManualSubmit = () => setShowConfirm(true)

  const confirmSubmit = () => {
    setShowConfirm(false)
    startSubmitting(async () => { await submitExam() })
  }

  if (!currentQuestion) {
    return (
      <Card className="mx-auto max-w-2xl mt-12">
        <CardContent className="py-12 text-center text-muted-foreground">
          Энэ шалгалтад асуулт олдсонгүй.
        </CardContent>
      </Card>
    )
  }

  const isFillIn = currentQuestion.question_type === "fill_in"
  const isUrgent = remainingMs <= 5 * 60_000
  const progressPct = (answeredCount / questions.length) * 100

  return (
    <>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-2.5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium truncate text-foreground/80 min-w-0">
              {examTitle}
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden sm:block text-xs text-muted-foreground">
                {answeredCount}/{questions.length} хариулсан
              </span>
              <Badge
                variant={isUrgent ? "destructive" : "outline"}
                className={cn(
                  "font-mono text-sm tabular-nums gap-1.5",
                  isUrgent && "animate-pulse"
                )}
              >
                <Timer className="size-3.5" />
                {formatRemaining(remainingMs)}
              </Badge>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        {/* Question navigator */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Асуултын жагсаалт
            </p>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((question, index) => {
                const isCurrent = index === currentIndex
                const isAnswered = Boolean(answers[question.id]?.trim())
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`Асуулт ${index + 1}`}
                    className={cn(
                      "size-9 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30 ring-offset-1"
                        : isAnswered
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                    )}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded bg-emerald-500" />
                Хариулсан ({answeredCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded bg-muted border border-border" />
                Хариулаагүй ({questions.length - answeredCount})
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Question card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {currentIndex + 1}
                </span>
                <CardTitle className="text-base">
                  Асуулт {currentIndex + 1} / {questions.length}
                </CardTitle>
              </div>
              {isFillIn && (
                <Badge variant="outline" className="text-xs">Бичгийн хариулт</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {currentQuestion.image_url && (
              <div className="flex justify-center">
                <img
                  src={currentQuestion.image_url}
                  alt="Асуултын зураг"
                  className="max-h-64 rounded-lg border object-contain bg-muted"
                />
              </div>
            )}

            <div className="text-base leading-relaxed">
              <MathText text={currentQuestion.question_text} />
            </div>

            {isFillIn ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Хариултаа бичнэ үү:
                </label>
                <input
                  type="text"
                  value={answers[currentQuestion.id] ?? ""}
                  onChange={(e) => handleFillInChange(currentQuestion.id, e.target.value)}
                  placeholder="Хариулт..."
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
                <p className="text-xs text-muted-foreground">
                  Хариулт автоматаар хадгалагдана.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedOptions.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectOption(currentQuestion.id, option.id)}
                      className={cn(
                        "w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {cyrillicLabel[option.option_label]}
                      </span>
                      <div className="flex-1 pt-0.5">
                        <MathText text={option.option_text} />
                        {option.image_url && (
                          <img
                            src={option.image_url}
                            alt={`Сонголт ${cyrillicLabel[option.option_label]}`}
                            className="mt-2 max-h-32 rounded-lg border object-contain bg-muted"
                          />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="size-4" />
                Өмнөх
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {questions.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="gap-1.5 cursor-pointer"
              >
                Дараах
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit bar */}
        <Card className="border-border/60">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {answeredCount === questions.length
                  ? "Бүх асуултанд хариуллаа."
                  : `${questions.length - answeredCount} асуулт хариулаагүй байна`}
              </p>
              <p className="text-xs text-muted-foreground">
                {answeredCount} / {questions.length} асуулт бөглөсөн
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleManualSubmit}
              disabled={submitting}
              className="gap-2 shrink-0 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Илгээж байна...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Шалгалт дуусгах
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Submit confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Шалгалт дуусгах уу?</DialogTitle>
            <DialogDescription>
              {answeredCount === questions.length ? (
                <>Бүх <strong>{questions.length}</strong> асуултанд хариуллаа. Шалгалтыг дуусгавал буцаах боломжгүй.</>
              ) : (
                <>
                  <strong className="text-destructive">{questions.length - answeredCount} асуулт</strong> хариулаагүй байна
                  ({questions.length} асуултаас {answeredCount} хариуллаа).
                  <br />
                  Хариулаагүй асуулт тооцогдохгүй.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="cursor-pointer"
            >
              Буцах
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSubmit}
              disabled={submitting}
              className="cursor-pointer"
            >
              Тийм, дуусгах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

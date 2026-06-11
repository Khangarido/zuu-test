"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { parseQuestions } from "@/lib/parse-questions"
import { bulkImportParsed } from "./_actions"
import dynamic from "next/dynamic"
const MathText = dynamic(() => import("@/components/math-text").then(m => m.MathText), { ssr: false })

type OptionLabel = "A" | "B" | "C" | "D" | "E"

type ReviewQuestion = {
  _key: string
  question_text: string
  question_type: "multiple_choice" | "fill_in"
  options: { A: string; B: string; C: string; D: string; E: string }
  correct: OptionLabel
  correct_answer: string
  difficulty: "easy" | "medium" | "hard"
  topic_name: string
  section_name: string
  explanation: string
}

const MONGOLIAN: Record<OptionLabel, string> = { A: "А", B: "Б", C: "В", D: "Г", E: "Д" }
const ALL_LABELS: OptionLabel[] = ["A", "B", "C", "D", "E"]

// ── Single question card ─────────────────────────────────────────────────────

function QuestionCard({
  q,
  index,
  isDragOver,
  onChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  q: ReviewQuestion
  index: number
  isDragOver: boolean
  onChange: (updated: ReviewQuestion) => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const activeLabels = ALL_LABELS.filter((l) => l !== "E" || q.options.E.trim() !== "")

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-lg border bg-card transition-colors ${
        isDragOver ? "border-primary ring-2 ring-primary/30" : ""
      }`}
    >
      {/* Drag handle + header */}
      <div className="flex items-start gap-2 p-4">
        <div
          className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground shrink-0"
          title="Чирж байрлуулах"
        >
          <GripVertical className="size-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">#{index + 1}</Badge>
            <Badge
              className={
                q.difficulty === "easy"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : q.difficulty === "hard"
                    ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              }
            >
              {q.difficulty === "easy" ? "Хялбар" : q.difficulty === "hard" ? "Хүнд" : "Дунд"}
            </Badge>
            {q.section_name && <Badge variant="outline" className="text-xs">{q.section_name}</Badge>}
            {q.topic_name && <Badge variant="secondary" className="text-xs">{q.topic_name}</Badge>}
          </div>

          {!expanded && (
            <p className="text-sm font-medium line-clamp-2">
              <MathText text={q.question_text} />
            </p>
          )}
        </div>

        <div className="flex gap-1 shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded((p) => !p)}>
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Preview (collapsed) */}
      {!expanded && (
        <div className="px-4 pb-4 pl-11 space-y-1">
          {q.question_type === "fill_in" ? (
            <div className="rounded border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 text-sm flex items-center gap-2">
              <span className="text-muted-foreground shrink-0">Зөв хариулт:</span>
              <span className="font-medium">{q.correct_answer || "—"}</span>
              <CheckCircle2 className="ml-auto size-4 text-emerald-600 shrink-0" />
            </div>
          ) : (
            activeLabels.map((label) => (
              <div
                key={label}
                className={`rounded border px-2 py-1 text-sm flex items-center gap-2 ${
                  q.correct === label
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 font-medium"
                    : "border-transparent"
                }`}
              >
                <span className="font-medium shrink-0">{MONGOLIAN[label]}.</span>
                <MathText text={q.options[label]} />
                {q.correct === label && (
                  <CheckCircle2 className="ml-auto size-4 text-emerald-600 shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit form (expanded) */}
      {expanded && (
        <div className="px-4 pb-4 pl-11 space-y-3 border-t pt-3">
          <div className="grid gap-1">
            <label className="text-xs font-medium text-muted-foreground">Асуултын текст</label>
            <textarea
              rows={3}
              value={q.question_text}
              onChange={(e) => onChange({ ...q, question_text: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>

          {q.question_type === "fill_in" ? (
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">Зөв хариулт (бичгийн)</label>
              <Input
                value={q.correct_answer}
                onChange={(e) => onChange({ ...q, correct_answer: e.target.value })}
                placeholder="Зөв хариулт..."
                className="text-sm font-mono"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Сонголтууд — зөв хариулт = радио товч
              </p>
              {ALL_LABELS.map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q._key}`}
                    checked={q.correct === label}
                    onChange={() => onChange({ ...q, correct: label })}
                  />
                  <span className="text-sm font-semibold w-5 shrink-0">{MONGOLIAN[label]}</span>
                  <Input
                    value={q.options[label]}
                    onChange={(e) =>
                      onChange({ ...q, options: { ...q.options, [label]: e.target.value } })
                    }
                    placeholder={label === "E" ? "Д сонголт (хоосон = 4 сонголт)" : `${MONGOLIAN[label]} сонголт`}
                    className="text-sm font-mono"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">Түвшин</label>
              <select
                value={q.difficulty}
                onChange={(e) =>
                  onChange({ ...q, difficulty: e.target.value as ReviewQuestion["difficulty"] })
                }
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                <option value="easy">Хялбар</option>
                <option value="medium">Дунд</option>
                <option value="hard">Хүнд</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">Сэдэв</label>
              <Input
                value={q.topic_name}
                onChange={(e) => onChange({ ...q, topic_name: e.target.value })}
                placeholder="Алгебр..."
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">Хэсэг</label>
              <Input
                value={q.section_name}
                onChange={(e) => onChange({ ...q, section_name: e.target.value })}
                placeholder="Хэсэг 1..."
              />
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-xs font-medium text-muted-foreground">Тайлбар (заавал биш)</label>
            <textarea
              rows={2}
              value={q.explanation}
              onChange={(e) => onChange({ ...q, explanation: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Зөв хариултын тайлбар..."
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section header divider ───────────────────────────────────────────────────

function SectionDivider({
  name,
  count,
  onRename,
}: {
  name: string
  count: number
  onRename: (newName: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(name)

  const commit = () => {
    onRename(val.trim() || name)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 my-2">
      <div className="h-px flex-1 bg-border" />
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit() }}
            className="h-7 text-sm w-44"
            autoFocus
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted transition-colors"
          title="Дарж нэр засах"
        >
          {name || "Хэсэггүй"} · {count} асуулт
        </button>
      )}
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function BulkImportClient({ examSetId }: { examSetId: string }) {
  const [raw, setRaw] = useState("")
  const [step, setStep] = useState<"input" | "review">("input")
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [parseErrors, setParseErrors] = useState<{ line: number; message: string }[]>([])
  const [topicMatching, setTopicMatching] = useState<"strict" | "fuzzy" | "none">("fuzzy")
  const [isPending, startTransition] = useTransition()
  const dragIndexRef = useRef<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const router = useRouter()

  // ── Parse step ──
  const handleParse = () => {
    const { questions: parsed, errors } = parseQuestions(raw)
    setParseErrors(errors)
    const reviewed: ReviewQuestion[] = parsed.map((q, i) => ({
      _key: `${i}-${Date.now()}`,
      question_text: q.question_text,
      question_type: q.question_type ?? "multiple_choice",
      options: { A: q.options.A, B: q.options.B, C: q.options.C, D: q.options.D, E: q.options.E ?? "" },
      correct: q.correct,
      correct_answer: q.correct_answer ?? "",
      difficulty: q.difficulty,
      topic_name: q.topic_name ?? "",
      section_name: q.section_name ?? "",
      explanation: q.explanation ?? "",
    }))
    setQuestions(reviewed)
    if (reviewed.length > 0) setStep("review")
    else toast.error("Зөв форматтай асуулт олдсонгүй.")
  }

  // ── Drag reorder ──
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDropTarget(index)
  }

  const handleDrop = (dropIndex: number) => {
    const dragIndex = dragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) {
      setDropTarget(null)
      return
    }
    setQuestions((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(dropIndex, 0, moved)
      return next
    })
    dragIndexRef.current = null
    setDropTarget(null)
  }

  // ── Rename an entire section ──
  const renameSection = (oldName: string, newName: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.section_name === oldName ? { ...q, section_name: newName } : q))
    )
  }

  // ── Import ──
  const handleImport = () => {
    startTransition(async () => {
      try {
        const response = await bulkImportParsed(examSetId, JSON.stringify(questions), topicMatching)
        if (response.dbError) { toast.error(response.dbError); return }
        toast.success(`${response.inserted} асуулт амжилттай импортлогдлоо!`)
        router.push(`/admin/questions?exam_set_id=${examSetId}`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Алдаа гарлаа.")
      }
    })
  }

  // ── Build section groups for rendering ──
  const sectionGroups: { section: string; indices: number[] }[] = []
  for (let i = 0; i < questions.length; i++) {
    const sec = questions[i].section_name
    const last = sectionGroups[sectionGroups.length - 1]
    if (last && last.section === sec) {
      last.indices.push(i)
    } else {
      sectionGroups.push({ section: sec, indices: [i] })
    }
  }

  // ── Review step ──
  if (step === "review") {
    return (
      <div className="space-y-4">
        {/* Sticky action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
          <div>
            <p className="font-semibold">{questions.length} асуулт бэлэн</p>
            <p className="text-sm text-muted-foreground">
              Чирж дараалал өөрчилж, засах товч дарж асуулт засна уу.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setStep("input"); setQuestions([]) }}>
              ← Буцах
            </Button>
            <div className="flex items-center gap-1.5">
              <label className="text-sm shrink-0">Сэдэв:</label>
              <select
                value={topicMatching}
                onChange={(e) => setTopicMatching(e.target.value as "strict" | "fuzzy" | "none")}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                <option value="fuzzy">Fuzzy</option>
                <option value="strict">Strict</option>
                <option value="none">Сэдэвгүй</option>
              </select>
            </div>
            <Button onClick={handleImport} disabled={isPending || questions.length === 0}>
              {isPending ? "Импортлож байна..." : `${questions.length} асуулт импортлох`}
            </Button>
          </div>
        </div>

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Алгасагдсан асуултууд ({parseErrors.length}):
            </p>
            {parseErrors.map((err, i) => (
              <p key={i} className="text-xs text-amber-600 dark:text-amber-500">
                Мөр {err.line}: {err.message}
              </p>
            ))}
          </div>
        )}

        {/* Questions grouped by section */}
        <div className="space-y-1">
          {sectionGroups.map((group) => (
            <div key={group.section}>
              <SectionDivider
                name={group.section}
                count={group.indices.length}
                onRename={(newName) => renameSection(group.section, newName)}
              />
              <div className="space-y-2">
                {group.indices.map((qi) => {
                  const q = questions[qi]
                  return (
                    <QuestionCard
                      key={q._key}
                      q={q}
                      index={qi}
                      isDragOver={dropTarget === qi}
                      onChange={(updated) =>
                        setQuestions((prev) => prev.map((x) => (x._key === updated._key ? updated : x)))
                      }
                      onDelete={() => setQuestions((prev) => prev.filter((x) => x._key !== q._key))}
                      onDragStart={() => handleDragStart(qi)}
                      onDragOver={(e) => handleDragOver(e, qi)}
                      onDrop={() => handleDrop(qi)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {questions.length > 4 && (
          <Button className="w-full" size="lg" onClick={handleImport} disabled={isPending || questions.length === 0}>
            {isPending ? "Импортлож байна..." : `${questions.length} асуулт импортлох`}
          </Button>
        )}
      </div>
    )
  }

  // ── Input step ──
  return (
    <Card>
      <CardHeader>
        <CardTitle>Импорт хийх өгөгдөл</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Хэсэг тусгаарлахдаа <code className="bg-muted px-1 rounded"># Хэсэг 1 — нэр</code> гэж бичнэ.</p>
          <p>Хариулт нь <code className="bg-muted px-1 rounded">ANSWER: D</code> эсвэл <code className="bg-muted px-1 rounded">ANSWER: Г</code> хоёулаа дэмжинэ.</p>
        </div>
        <textarea
          rows={22}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
          placeholder="# Хэсэг 1 — Олон сонголт&#10;Q: Асуулт...&#10;A. ...&#10;B. ...&#10;ANSWER: B&#10;---"
        />
        <Button type="button" onClick={handleParse} disabled={!raw.trim()}>
          Задлан шалгах →
        </Button>
      </CardContent>
    </Card>
  )
}

"use client"

import { useRef, useMemo, useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { CheckCircle2, ChevronDown, ChevronUp, ImageIcon, X } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createQuestion } from "./_actions"
import type { deleteQuestion, updateQuestion } from "./_actions"

type TopicOption = {
  id: string
  name: string
  subject_name: string
}

type AnswerOption = {
  option_label: "A" | "B" | "C" | "D" | "E"
  option_text: string
  is_correct: boolean
  image_url?: string | null
}

type QuestionData = {
  id: string
  exam_set_id: string
  topic_id: string | null
  question_text: string
  difficulty: "easy" | "medium" | "hard"
  points: number
  order_index: number
  section_name: string | null
  explanation: string | null
  topic_name: string | null
  image_url: string | null
  answer_options: AnswerOption[]
}

const mongolianOptionLabel: Record<"A" | "B" | "C" | "D" | "E", string> = {
  A: "А",
  B: "Б",
  C: "В",
  D: "Г",
  E: "Д",
}

const difficultyLabel: Record<QuestionData["difficulty"], string> = {
  easy: "Хялбар",
  medium: "Дунд",
  hard: "Хүнд",
}

const difficultyClass: Record<QuestionData["difficulty"], string> = {
  easy: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-red-100 text-red-800",
}

const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const
type OptionLabel = typeof OPTION_LABELS[number]
type OptionImages = Record<OptionLabel, string | null>
type OptionUploading = Record<OptionLabel, boolean>

function emptyOptionImages(): OptionImages {
  return { A: null, B: null, C: null, D: null, E: null }
}
function emptyOptionUploading(): OptionUploading {
  return { A: false, B: false, C: false, D: false, E: false }
}

function makeOptionUploadHandler(
  label: OptionLabel,
  setUploading: React.Dispatch<React.SetStateAction<OptionUploading>>,
  setImages: React.Dispatch<React.SetStateAction<OptionImages>>
) {
  return async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const inputEl = e.target
    setUploading((prev) => ({ ...prev, [label]: true }))
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop() ?? "jpg"
      const path = `options/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from("question-images").upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from("question-images").getPublicUrl(path)
      setImages((prev) => ({ ...prev, [label]: publicUrl }))
      toast.success("Зураг байршлаа.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Зураг байршуулахад алдаа гарлаа.")
    } finally {
      setUploading((prev) => ({ ...prev, [label]: false }))
      inputEl.value = ""
    }
  }
}

export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: string
  pendingText: string
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </Button>
  )
}

export function ExamSetPicker({
  examSets,
  selectedExamSetId,
}: {
  examSets: Array<{ id: string; title: string }>
  selectedExamSetId: string
}) {
  return (
    <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid gap-2 sm:min-w-96">
        <label htmlFor="exam_set_id" className="text-sm font-medium">
          Шалгалтын багц сонгох
        </label>
        <select
          id="exam_set_id"
          name="exam_set_id"
          defaultValue={selectedExamSetId}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">-- Сонгоно уу --</option>
          {examSets.map((examSet) => (
            <option key={examSet.id} value={examSet.id}>
              {examSet.title}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline">
        Шүүх
      </Button>
    </form>
  )
}

// ─── Option Row with Image Upload ─────────────────────────────────────────────

function OptionRow({
  label,
  inputName,
  defaultValue,
  required,
  placeholder,
  imageUrl,
  uploading,
  onImageChange,
  onRemoveImage,
}: {
  label: OptionLabel
  inputName: string
  defaultValue?: string
  required?: boolean
  placeholder: string
  imageUrl: string | null
  uploading: boolean
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold w-6 shrink-0 text-center">{mongolianOptionLabel[label]}</span>
        <Input
          name={inputName}
          required={required}
          maxLength={500}
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      </div>
      <input type="hidden" name={`option_${label.toLowerCase()}_image_url`} value={imageUrl ?? ""} />
      <div className="pl-8">
        {imageUrl ? (
          <div className="flex items-center gap-2">
            <img
              src={imageUrl}
              alt={`Сонголт ${mongolianOptionLabel[label]}`}
              className="h-14 rounded border object-contain bg-muted"
            />
            <Button type="button" size="sm" variant="ghost" onClick={onRemoveImage} className="shrink-0">
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={onImageChange}
              disabled={uploading}
            />
            <ImageIcon className="size-3" />
            <span>{uploading ? "Байршуулж байна..." : "Зураг нэмэх"}</span>
          </label>
        )}
      </div>
    </div>
  )
}

// ─── Create Question Form ─────────────────────────────────────────────────────

export function CreateQuestionForm({
  examSetId,
  selectedTopicId,
  groupedTopics,
}: {
  examSetId: string
  selectedTopicId: string
  groupedTopics: Record<string, TopicOption[]>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [optionImages, setOptionImages] = useState<OptionImages>(emptyOptionImages)
  const [optionUploading, setOptionUploading] = useState<OptionUploading>(emptyOptionUploading)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    let uploadedUrl = ""
    if (imageFile) {
      setUploading(true)
      try {
        const supabase = createClient()
        const ext = imageFile.name.split(".").pop() ?? "jpg"
        const path = `drafts/${crypto.randomUUID()}.${ext}`
        const { error } = await supabase.storage.from("question-images").upload(path, imageFile)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from("question-images").getPublicUrl(path)
        uploadedUrl = publicUrl
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Зураг байршуулахад алдаа гарлаа.")
        setUploading(false)
        return
      }
      setUploading(false)
    }

    formData.set("image_url", uploadedUrl)

    startTransition(async () => {
      try {
        await createQuestion(formData)
        toast.success("Асуулт нэмэгдлээ.")
        formRef.current?.reset()
        setImageFile(null)
        setImagePreview(null)
        setOptionImages(emptyOptionImages())
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Асуулт нэмэх үед алдаа гарлаа.")
      }
    })
  }

  const busy = uploading || isPending

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="exam_set_id" value={examSetId} />

      <div className="grid gap-2">
        <label className="text-sm font-medium">Асуултын текст</label>
        <textarea
          name="question_text"
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Асуултаа энд бичнэ үү..."
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Сэдэв (сонголттой)</label>
        <select
          name="topic_id"
          defaultValue={selectedTopicId}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">-- Сэдэв сонгоогүй --</option>
          {Object.entries(groupedTopics).map(([subjectName, items]) => (
            <optgroup key={subjectName} label={subjectName}>
              {items.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Хэсэг (сонголттой)</label>
          <Input name="section_name" maxLength={100} placeholder="Жишээ: Хэсэг 1" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Дэс дугаар</label>
          <Input name="order_index" type="number" min={0} defaultValue={1} required />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Оноо оноо</label>
          <Input name="points" type="number" min={1} max={20} defaultValue={1} required />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Түвшин</label>
        <select
          name="difficulty"
          defaultValue="medium"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="easy">Хялбар</option>
          <option value="medium">Дунд</option>
          <option value="hard">Хүнд</option>
        </select>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Хариултын сонголтууд</p>
        {OPTION_LABELS.map((label) => (
          <OptionRow
            key={label}
            label={label}
            inputName={`option_${label.toLowerCase()}`}
            required={label !== "E"}
            placeholder={`${mongolianOptionLabel[label]} сонголт${label === "E" ? " (заавал биш)" : ""}`}
            imageUrl={optionImages[label]}
            uploading={optionUploading[label]}
            onImageChange={makeOptionUploadHandler(label, setOptionUploading, setOptionImages)}
            onRemoveImage={() => setOptionImages((prev) => ({ ...prev, [label]: null }))}
          />
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Зөв хариулт</p>
        <div className="flex flex-wrap gap-4">
          {OPTION_LABELS.map((val) => (
            <label key={val} className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="correct_option" value={val} required />
              {mongolianOptionLabel[val]}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Зураг (сонголттой)</label>
        <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP — дээд тал нь 5MB</p>
        {imagePreview ? (
          <div className="space-y-2">
            <img
              src={imagePreview}
              alt="Урьдчилан харах"
              className="max-h-48 rounded-md border object-contain bg-muted"
            />
            <Button type="button" variant="outline" size="sm" onClick={removeImage}>
              <X className="size-4 mr-1" /> Зураг устгах
            </Button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                <ImageIcon className="size-4 mr-1" /> Зураг сонгох
              </span>
            </Button>
          </label>
        )}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">
          Тайлбар (шалгалтын дараа сурагчид харагдана)
        </label>
        <textarea
          name="explanation"
          rows={4}
          maxLength={2000}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit" disabled={busy}>
        {busy
          ? uploading
            ? "Зураг байршуулж байна..."
            : "Нэмж байна..."
          : "Асуулт нэмэх"}
      </Button>
    </form>
  )
}

// ─── Question Crud Card ───────────────────────────────────────────────────────

export function QuestionCrudCard({
  question,
  topicOptions,
  actions,
}: {
  question: QuestionData
  topicOptions: TopicOption[]
  actions: {
    updateQuestion: typeof updateQuestion
    deleteQuestion: typeof deleteQuestion
  }
}) {
  const [expandedQuestion, setExpandedQuestion] = useState(false)
  const [expandedExplanation, setExpandedExplanation] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const sortedOptions = useMemo(() => {
    const order = ["A", "B", "C", "D", "E"]
    return [...question.answer_options].sort(
      (a, b) => order.indexOf(a.option_label) - order.indexOf(b.option_label)
    )
  }, [question.answer_options])

  const optionMap = useMemo(() => {
    const map = new Map<OptionLabel, AnswerOption>()
    for (const option of sortedOptions) {
      map.set(option.option_label, option)
    }
    return map
  }, [sortedOptions])

  const correctOption = sortedOptions.find((option) => option.is_correct)?.option_label ?? "A"

  const [imageUrl, setImageUrl] = useState<string | null>(question.image_url ?? null)
  const [uploading, setUploading] = useState(false)

  const [editOptionImages, setEditOptionImages] = useState<OptionImages>(() => ({
    A: optionMap.get("A")?.image_url ?? null,
    B: optionMap.get("B")?.image_url ?? null,
    C: optionMap.get("C")?.image_url ?? null,
    D: optionMap.get("D")?.image_url ?? null,
    E: optionMap.get("E")?.image_url ?? null,
  }))
  const [editOptionUploading, setEditOptionUploading] = useState<OptionUploading>(emptyOptionUploading)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop() ?? "jpg"
      const path = `${question.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("question-images")
        .upload(path, file, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      const { data: { publicUrl } } = supabase.storage
        .from("question-images")
        .getPublicUrl(path)
      setImageUrl(publicUrl)
      toast.success("Зураг амжилттай байршлаа.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Зураг байршуулахад алдаа гарлаа.")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleDelete = () => {
    if (!confirm("Энэ асуултыг устгах уу?")) return
    startTransition(async () => {
      try {
        await actions.deleteQuestion(question.id)
        toast.success("Асуулт устлаа.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Асуулт устгах үед алдаа гарлаа.")
      }
    })
  }

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {question.section_name ? (
              <Badge variant="outline" className="text-xs">{question.section_name}</Badge>
            ) : null}
            <Badge variant="outline">№ {question.order_index}</Badge>
            <Badge variant="secondary">{question.points ?? 1} оноо</Badge>
            <Badge className={difficultyClass[question.difficulty]}>
              {difficultyLabel[question.difficulty]}
            </Badge>
            {question.topic_name ? <Badge variant="secondary">{question.topic_name}</Badge> : null}
            {imageUrl ? <Badge variant="outline" className="text-xs gap-1"><ImageIcon className="size-3" /> Зураг</Badge> : null}
          </div>
          <button
            type="button"
            onClick={() => setExpandedQuestion((prev) => !prev)}
            className="text-left w-full"
          >
            <h2 className={`font-medium ${expandedQuestion ? "" : "line-clamp-2"}`}>
              {question.question_text}
            </h2>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground mt-1">
              {expandedQuestion ? (
                <><ChevronUp className="size-4" /> Хураах</>
              ) : (
                <><ChevronDown className="size-4" /> Дэлгэрүүлэх</>
              )}
            </span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Засах</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85svh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Асуулт засах</DialogTitle>
                <DialogDescription>Асуулт болон сонголтуудыг шинэчилнэ.</DialogDescription>
              </DialogHeader>
              <form
                action={async (formData) => {
                  try {
                    await actions.updateQuestion(question.id, formData)
                    setIsEditOpen(false)
                    toast.success("Асуулт шинэчлэгдлээ.")
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Асуулт шинэчлэх үед алдаа гарлаа."
                    )
                  }
                }}
                className="space-y-4"
              >
                <input type="hidden" name="exam_set_id" value={question.exam_set_id} />
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Асуултын текст</label>
                  <textarea
                    name="question_text"
                    required
                    minLength={5}
                    maxLength={2000}
                    defaultValue={question.question_text}
                    rows={4}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Сэдэв</label>
                  <select
                    name="topic_id"
                    defaultValue={question.topic_id ?? ""}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">-- Сэдэв сонгоогүй --</option>
                    {topicOptions.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.subject_name} — {topic.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Хэсэг</label>
                    <Input
                      name="section_name"
                      maxLength={100}
                      defaultValue={question.section_name ?? ""}
                      placeholder="Жишээ: Хэсэг 1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Дэс дугаар</label>
                    <Input
                      name="order_index"
                      type="number"
                      min={0}
                      defaultValue={question.order_index}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Оноо оноо</label>
                    <Input
                      name="points"
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={question.points ?? 1}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Түвшин</label>
                  <select
                    name="difficulty"
                    defaultValue={question.difficulty}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="easy">Хялбар</option>
                    <option value="medium">Дунд</option>
                    <option value="hard">Хүнд</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">Сонголтууд</p>
                  {OPTION_LABELS.map((label) => (
                    <OptionRow
                      key={label}
                      label={label}
                      inputName={`option_${label.toLowerCase()}`}
                      required={label !== "E"}
                      defaultValue={optionMap.get(label)?.option_text ?? ""}
                      placeholder={`${mongolianOptionLabel[label]} сонголт${label === "E" ? " (заавал биш)" : ""}`}
                      imageUrl={editOptionImages[label]}
                      uploading={editOptionUploading[label]}
                      onImageChange={makeOptionUploadHandler(label, setEditOptionUploading, setEditOptionImages)}
                      onRemoveImage={() => setEditOptionImages((prev) => ({ ...prev, [label]: null }))}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Зөв хариулт</p>
                  <div className="flex flex-wrap gap-4">
                    {OPTION_LABELS.map((label) => (
                      <label key={label} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="correct_option"
                          value={label}
                          defaultChecked={correctOption === label}
                          required
                        />
                        {mongolianOptionLabel[label]}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Зураг (сонголттой)</label>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP — дээд тал нь 5MB</p>
                  <input type="hidden" name="image_url" value={imageUrl ?? ""} />
                  {imageUrl ? (
                    <div className="space-y-2">
                      <img
                        src={imageUrl}
                        alt="Асуултын зураг"
                        className="max-h-52 rounded-md border object-contain bg-muted"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setImageUrl(null)}
                      >
                        <X className="size-4 mr-1" /> Зураг устгах
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                      <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                        <span>
                          <ImageIcon className="size-4 mr-1" />
                          {uploading ? "Байршуулж байна..." : "Зураг оруулах"}
                        </span>
                      </Button>
                    </label>
                  )}
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    Тайлбар (шалгалтын дараа сурагчид харагдана)
                  </label>
                  <textarea
                    name="explanation"
                    maxLength={2000}
                    rows={4}
                    defaultValue={question.explanation ?? ""}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <SubmitButton pendingText="Хадгалж байна...">Хадгалах</SubmitButton>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
            Устгах
          </Button>
        </div>
      </div>

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Асуултын зураг"
          className="max-h-40 rounded-md border object-contain bg-muted"
        />
      )}

      <ul className="space-y-2">
        {sortedOptions.map((option) => (
          <li
            key={option.option_label}
            className={`rounded-md border px-3 py-2 text-sm ${
              option.is_correct ? "border-emerald-500 bg-emerald-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span>
                <span className="font-medium mr-2">
                  {mongolianOptionLabel[option.option_label]}.
                </span>
                {option.option_text}
              </span>
              {option.is_correct ? <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> : null}
            </div>
            {option.image_url && (
              <img
                src={option.image_url}
                alt={`Сонголт ${mongolianOptionLabel[option.option_label]}`}
                className="mt-2 h-16 rounded border object-contain bg-muted"
              />
            )}
          </li>
        ))}
      </ul>

      {question.explanation ? (
        <details
          open={expandedExplanation}
          onToggle={(e) => setExpandedExplanation((e.currentTarget as HTMLDetailsElement).open)}
          className="mt-2"
        >
          <summary className="cursor-pointer text-sm text-muted-foreground">Тайлбар</summary>
          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{question.explanation}</p>
        </details>
      ) : null}
    </div>
  )
}

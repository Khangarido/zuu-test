"use client"

import { useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { Clock3, Shuffle, Wallet } from "lucide-react"
import { toast } from "sonner"
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
import type {
  deleteExamSet,
  toggleExamSetActive,
  updateExamSet,
} from "./_actions"
import { DEFAULT_CARD_COLOR1, DEFAULT_CARD_COLOR2 } from "@/lib/exam-card-colors"

type SubjectOption = {
  id: string
  name: string
}

type ExamSet = {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  price: number
  shuffle_questions: boolean
  is_active: boolean
  is_new: boolean
  is_recommended: boolean
  subject_id: string
  subject_name: string
  card_color1: string | null
  card_color2: string | null
}

export function CardColorFields({
  color1 = DEFAULT_CARD_COLOR1,
  color2 = DEFAULT_CARD_COLOR2,
  idPrefix = "",
}: {
  color1?: string
  color2?: string
  idPrefix?: string
}) {
  const [c1, setC1] = useState(color1)
  const [c2, setC2] = useState(color2)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}card_color1`} className="text-sm font-medium">
            Картын өнгө 1
          </label>
          <input
            id={`${idPrefix}card_color1`}
            name="card_color1"
            type="color"
            value={c1}
            onChange={(e) => setC1(e.target.value)}
            className="size-10 cursor-pointer rounded border bg-background p-0.5"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}card_color2`} className="text-sm font-medium">
            Картын өнгө 2
          </label>
          <input
            id={`${idPrefix}card_color2`}
            name="card_color2"
            type="color"
            value={c2}
            onChange={(e) => setC2(e.target.value)}
            className="size-10 cursor-pointer rounded border bg-background p-0.5"
          />
        </div>
        <div
          className="rounded-lg shrink-0 border border-border/60"
          style={{
            width: 60,
            height: 32,
            background: `linear-gradient(145deg, ${c1}, ${c2})`,
          }}
          title="Урьдчилан харах"
        />
      </div>
    </div>
  )
}

type ExamSetActions = {
  updateExamSet: typeof updateExamSet
  deleteExamSet: typeof deleteExamSet
  toggleExamSetActive: typeof toggleExamSetActive
}

const mntFormatter = new Intl.NumberFormat("mn-MN")

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

export function ExamSetCrudCard({
  examSet,
  subjectOptions,
  actions,
}: {
  examSet: ExamSet
  subjectOptions: SubjectOption[]
  actions: ExamSetActions
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await actions.toggleExamSetActive(examSet.id, !examSet.is_active)
        toast.success(
          !examSet.is_active
            ? "Шалгалтыг идэвхтэй болголоо."
            : "Шалгалтыг идэвхгүй болголоо."
        )
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Идэвхийн төлөв өөрчлөхөд алдаа гарлаа."
        )
      }
    })
  }

  const handleDelete = () => {
    if (!confirm(`"${examSet.title}" шалгалтыг устгах уу?`)) return

    startTransition(async () => {
      try {
        await actions.deleteExamSet(examSet.id)
        toast.success("Шалгалт устлаа.")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Шалгалт устгах үед алдаа гарлаа."
        )
      }
    })
  }

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{examSet.title}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{examSet.subject_name}</Badge>
            <Badge variant={examSet.is_active ? "default" : "secondary"}>
              {examSet.is_active ? "Идэвхтэй" : "Идэвхгүй"}
            </Badge>
            <div
              className="rounded-md border border-border/60 shrink-0"
              style={{
                width: 60,
                height: 32,
                background: `linear-gradient(145deg, ${examSet.card_color1 ?? DEFAULT_CARD_COLOR1}, ${examSet.card_color2 ?? DEFAULT_CARD_COLOR2})`,
              }}
              title="Картын өнгө"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {examSet.description?.trim() || "Тайлбар оруулаагүй байна."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Засах
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Шалгалт засах</DialogTitle>
                <DialogDescription>
                  {examSet.title} шалгалтын мэдээллийг шинэчилнэ.
                </DialogDescription>
              </DialogHeader>
              <form
                action={async (formData) => {
                  try {
                    await actions.updateExamSet(examSet.id, formData)
                    setIsEditOpen(false)
                    toast.success("Шалгалтын мэдээлэл шинэчлэгдлээ.")
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Шалгалт шинэчлэх үед алдаа гарлаа."
                    )
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label htmlFor={`title-${examSet.id}`} className="text-sm font-medium">
                    Гарчиг
                  </label>
                  <Input
                    id={`title-${examSet.id}`}
                    name="title"
                    defaultValue={examSet.title}
                    required
                    minLength={2}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`description-${examSet.id}`} className="text-sm font-medium">
                    Тайлбар
                  </label>
                  <textarea
                    id={`description-${examSet.id}`}
                    name="description"
                    rows={4}
                    defaultValue={examSet.description ?? ""}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`subject-${examSet.id}`} className="text-sm font-medium">
                    Хичээл
                  </label>
                  <select
                    id={`subject-${examSet.id}`}
                    name="subject_id"
                    required
                    defaultValue={examSet.subject_id}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {subjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor={`duration-${examSet.id}`} className="text-sm font-medium">
                      Хугацаа (минут)
                    </label>
                    <Input
                      id={`duration-${examSet.id}`}
                      name="duration_minutes"
                      type="number"
                      min={5}
                      max={300}
                      defaultValue={examSet.duration_minutes}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`price-${examSet.id}`} className="text-sm font-medium">
                      Үнэ (₮)
                    </label>
                    <Input
                      id={`price-${examSet.id}`}
                      name="price"
                      type="number"
                      min={0}
                      defaultValue={examSet.price}
                      required
                    />
                  </div>
                </div>
                <CardColorFields
                  idPrefix={`edit-${examSet.id}-`}
                  color1={examSet.card_color1 ?? DEFAULT_CARD_COLOR1}
                  color2={examSet.card_color2 ?? DEFAULT_CARD_COLOR2}
                />
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      name="shuffle_questions"
                      defaultChecked={examSet.shuffle_questions}
                      className="size-4 rounded border"
                    />
                    Асуултыг санамсаргүй эрэмбэлэх
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={examSet.is_active}
                      className="size-4 rounded border"
                    />
                    Идэвхтэй эсэх
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      name="is_new"
                      defaultChecked={examSet.is_new}
                      className="size-4 rounded border"
                    />
                    ✨ Шинэ шалгалт гэж тэмдэглэх
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      name="is_recommended"
                      defaultChecked={examSet.is_recommended}
                      className="size-4 rounded border"
                    />
                    ⭐ Санал болгох шалгалт гэж тэмдэглэх
                  </label>
                </div>
                <SubmitButton pendingText="Хадгалж байна...">Хадгалах</SubmitButton>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="secondary" size="sm" onClick={handleToggle} disabled={isPending}>
            {examSet.is_active ? "Идэвхгүй болгох" : "Идэвхтэй болгох"}
          </Button>

          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
            Устгах
          </Button>
        </div>
      </div>

      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2">
          <Clock3 className="size-4" />
          <span>{examSet.duration_minutes} минут</span>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="size-4" />
          <span>{mntFormatter.format(examSet.price)}₮</span>
        </div>
        <div className="flex items-center gap-2">
          <Shuffle className="size-4" />
          <span>
            Санамсаргүй: {examSet.shuffle_questions ? "Тийм" : "Үгүй"}
          </span>
        </div>
        <div>
          <Badge variant={examSet.is_active ? "default" : "secondary"}>
            {examSet.is_active ? "Идэвхтэй" : "Идэвхгүй"}
          </Badge>
        </div>
      </div>
    </div>
  )
}

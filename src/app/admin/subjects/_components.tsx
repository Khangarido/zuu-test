"use client"

import { useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
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
import type { createTopic, deleteSubject, deleteTopic, updateSubject } from "./_actions"

type Topic = {
  id: string
  name: string
}

type Subject = {
  id: string
  name: string
  description: string | null
  icon: string | null
  is_active: boolean
  topics: Topic[]
}

type SubjectActions = {
  updateSubject: typeof updateSubject
  deleteSubject: typeof deleteSubject
  createTopic: typeof createTopic
  deleteTopic: typeof deleteTopic
}

function SubmitButton({ pendingText, children }: { pendingText: string; children: string }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto"
    >
      {pending ? pendingText : children}
    </Button>
  )
}

export function SubjectCrudCard({
  subject,
  actions,
}: {
  subject: Subject
  actions: SubjectActions
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isTopicOpen, setIsTopicOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDeleteSubject = () => {
    if (!confirm(`"${subject.name}" хичээлийг устгах уу?`)) return

    startTransition(async () => {
      try {
        await actions.deleteSubject(subject.id)
        toast.success("Хичээл устлаа.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Хичээл устгах үед алдаа гарлаа.")
      }
    })
  }

  const handleDeleteTopic = (topic: Topic) => {
    if (!confirm(`"${topic.name}" сэдвийг устгах уу?`)) return

    startTransition(async () => {
      try {
        await actions.deleteTopic(topic.id)
        toast.success("Сэдэв устлаа.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Сэдэв устгах үед алдаа гарлаа.")
      }
    })
  }

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>{subject.icon?.trim() ? subject.icon : "📘"}</span>
            <span>{subject.name}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {subject.description?.trim() || "Тайлбар оруулаагүй байна."}
          </p>
          <Badge variant={subject.is_active ? "default" : "secondary"}>
            {subject.is_active ? "Идэвхтэй" : "Идэвхгүй"}
          </Badge>
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
                <DialogTitle>Хичээл засах</DialogTitle>
                <DialogDescription>{subject.name} хичээлийн мэдээллийг шинэчилнэ.</DialogDescription>
              </DialogHeader>
              <form
                action={async (formData) => {
                  try {
                    await actions.updateSubject(subject.id, formData)
                    setIsEditOpen(false)
                    toast.success("Хичээл шинэчлэгдлээ.")
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Хичээл шинэчлэх үед алдаа гарлаа."
                    )
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label htmlFor={`name-${subject.id}`} className="text-sm font-medium">
                    Хичээлийн нэр
                  </label>
                  <Input
                    id={`name-${subject.id}`}
                    name="name"
                    defaultValue={subject.name}
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`description-${subject.id}`} className="text-sm font-medium">
                    Тайлбар
                  </label>
                  <textarea
                    id={`description-${subject.id}`}
                    name="description"
                    defaultValue={subject.description ?? ""}
                    rows={4}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`icon-${subject.id}`} className="text-sm font-medium">
                    Icon (emoji эсвэл богино текст)
                  </label>
                  <Input
                    id={`icon-${subject.id}`}
                    name="icon"
                    defaultValue={subject.icon ?? ""}
                    maxLength={20}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={subject.is_active}
                    className="size-4 rounded border"
                  />
                  Идэвхтэй эсэх
                </label>
                <SubmitButton pendingText="Хадгалж байна...">Хадгалах</SubmitButton>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTopicOpen} onOpenChange={setIsTopicOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                Сэдэв нэмэх
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Шинэ сэдэв нэмэх</DialogTitle>
                <DialogDescription>{subject.name} хичээлд сэдэв нэмнэ.</DialogDescription>
              </DialogHeader>
              <form
                action={async (formData) => {
                  try {
                    await actions.createTopic(subject.id, formData)
                    setIsTopicOpen(false)
                    toast.success("Сэдэв нэмэгдлээ.")
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Сэдэв нэмэхэд алдаа гарлаа.")
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label htmlFor={`topic-name-${subject.id}`} className="text-sm font-medium">
                    Сэдвийн нэр
                  </label>
                  <Input
                    id={`topic-name-${subject.id}`}
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Жишээ: Тэгшитгэл"
                  />
                </div>
                <SubmitButton pendingText="Нэмэж байна...">Нэмэх</SubmitButton>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSubject}
            disabled={isPending}
          >
            Устгах
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Сэдвүүд</p>
        {subject.topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">Одоогоор сэдэв алга.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subject.topics.map((topic) => (
              <Badge key={topic.id} variant="outline" className="flex items-center gap-2 py-1">
                <span>{topic.name}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteTopic(topic)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                  disabled={isPending}
                  aria-label={`${topic.name} сэдвийг устгах`}
                >
                  ✕
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

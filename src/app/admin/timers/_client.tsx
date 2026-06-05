"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, Plus, Timer, School } from "lucide-react"
import { addTimer, deleteTimer } from "./_actions"

type ClassTimer = {
  id: string
  class_id: string
  label: string
  target_date: string
}

type ClassRow = {
  id: string
  name: string
  slug: string
}

type Props = {
  classes: ClassRow[]
  initialTimers: ClassTimer[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isPast(iso: string) {
  return new Date(iso).getTime() < Date.now()
}

export function TimersClient({ classes, initialTimers }: Props) {
  const [timers, setTimers] = useState<ClassTimer[]>(initialTimers)
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd(classId: string) {
    if (!label.trim() || !targetDate) {
      toast.error("Гарчиг болон огноо оруулна уу")
      return
    }
    setSaving(true)
    try {
      await addTimer(classId, label, targetDate)
      const newTimer: ClassTimer = {
        id: crypto.randomUUID(),
        class_id: classId,
        label: label.trim(),
        target_date: new Date(targetDate).toISOString(),
      }
      setTimers((prev) => [...prev, newTimer])
      toast.success("Таймер нэмэгдлээ")
      setAddingFor(null)
      setLabel("")
      setTargetDate("")
    } catch (e: any) {
      toast.error(e?.message ?? "Алдаа гарлаа")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(timerId: string) {
    setDeletingId(timerId)
    try {
      await deleteTimer(timerId)
      setTimers((prev) => prev.filter((t) => t.id !== timerId))
      toast.success("Таймер устгагдлаа")
    } catch (e: any) {
      toast.error(e?.message ?? "Алдаа гарлаа")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {classes.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
          <School className="size-10 opacity-30" />
          <p className="text-sm">Анги байхгүй байна</p>
        </div>
      ) : (
        classes.map((cls) => {
          const clsTimers = timers.filter((t) => t.class_id === cls.id)
          const isAdding = addingFor === cls.id

          return (
            <div key={cls.id} className="border rounded-xl overflow-hidden">
              {/* Class header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
                <div className="flex items-center gap-2">
                  <School className="size-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{cls.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {clsTimers.length} таймер
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => {
                    if (isAdding) {
                      setAddingFor(null)
                    } else {
                      setAddingFor(cls.id)
                      setLabel("")
                      setTargetDate("")
                    }
                  }}
                >
                  <Plus className="size-3" />
                  Таймер нэмэх
                </Button>
              </div>

              {/* Add timer form */}
              {isAdding && (
                <div className="px-4 py-3 border-b bg-primary/5 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[180px] space-y-1">
                    <label className="text-xs text-muted-foreground">Гарчиг</label>
                    <Input
                      placeholder="жишээ: Хаврын олимпиад"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <label className="text-xs text-muted-foreground">Огноо & цаг</label>
                    <Input
                      type="datetime-local"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => setAddingFor(null)}
                      disabled={saving}
                    >
                      Болих
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => handleAdd(cls.id)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                      Нэмэх
                    </Button>
                  </div>
                </div>
              )}

              {/* Timer list */}
              {clsTimers.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Таймер байхгүй
                </div>
              ) : (
                <div className="divide-y">
                  {clsTimers
                    .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
                    .map((timer) => {
                      const past = isPast(timer.target_date)
                      return (
                        <div
                          key={timer.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <Timer className={`size-4 shrink-0 ${past ? "text-muted-foreground/40" : "text-indigo-500"}`} />
                            <div>
                              <p className={`text-sm font-medium ${past ? "text-muted-foreground line-through" : ""}`}>
                                {timer.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(timer.target_date)}
                                {past && " · Дууссан"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(timer.id)}
                            disabled={deletingId === timer.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                          >
                            {deletingId === timer.id
                              ? <Loader2 className="size-4 animate-spin" />
                              : <Trash2 className="size-4" />
                            }
                          </button>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

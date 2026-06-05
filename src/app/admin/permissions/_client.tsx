"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, BookOpen } from "lucide-react"
import {
  updateUserPermissions,
  getExamSetsWithAccess,
  updateUserExamAccess,
  type ExamSetAccessRow,
} from "./_actions"

type UserRow = {
  id: string
  full_name: string | null
  username: string | null
  email: string | null
  avatar_url: string | null
  role: string | null
  is_teacher: boolean
  can_post: boolean
  can_comment: boolean
  grade: string | null
  school: string | null
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export function PermissionsClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<UserRow | null>(null)
  const [isTeacher, setIsTeacher] = useState(false)
  const [canPost, setCanPost] = useState(false)
  const [canComment, setCanComment] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localUsers, setLocalUsers] = useState<UserRow[]>(users)

  const [examSets, setExamSets] = useState<ExamSetAccessRow[]>([])
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set())
  const [loadingExams, setLoadingExams] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return localUsers
    return localUsers.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    )
  }, [search, localUsers])

  async function openUser(u: UserRow) {
    setSelected(u)
    setIsTeacher(u.is_teacher)
    setCanPost(u.can_post)
    setCanComment(u.can_comment)
    setExamSets([])
    setSelectedExamIds(new Set())
    setLoadingExams(true)
    try {
      const rows = await getExamSetsWithAccess(u.id)
      setExamSets(rows)
      setSelectedExamIds(
        new Set(rows.filter((e) => e.has_access && !e.is_free).map((e) => e.id))
      )
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Шалгалт ачааллахад алдаа гарлаа")
    } finally {
      setLoadingExams(false)
    }
  }

  function toggleExam(examId: string, checked: boolean) {
    setSelectedExamIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(examId)
      else next.delete(examId)
      return next
    })
  }

  function grantAllPaid() {
    setSelectedExamIds(new Set(examSets.filter((e) => !e.is_free).map((e) => e.id)))
  }

  function clearAllAccess() {
    setSelectedExamIds(new Set())
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      await updateUserPermissions(selected.id, {
        is_teacher: isTeacher,
        can_post: canPost,
        can_comment: canComment,
      })
      await updateUserExamAccess(selected.id, Array.from(selectedExamIds))
      setLocalUsers((prev) =>
        prev.map((u) =>
          u.id === selected.id
            ? { ...u, is_teacher: isTeacher, can_post: canPost, can_comment: canComment }
            : u
        )
      )
      toast.success("Эрх амжилттай хадгалагдлаа")
      setSelected(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Нэр, хэрэглэгчийн нэр эсвэл имэйлээр хайх..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} / {localUsers.length} хэрэглэгч
      </p>

      <div className="border rounded-xl overflow-hidden divide-y">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Хэрэглэгч олдсонгүй
          </div>
        ) : (
          filtered.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => openUser(u)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              <Avatar className="size-9 shrink-0">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold">
                  {initials(u.full_name ?? "?")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold truncate">
                    {u.full_name ?? "—"}
                  </span>
                  {u.username && (
                    <span className="text-xs text-muted-foreground">@{u.username}</span>
                  )}
                  {u.is_teacher && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      Багш
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {u.email ?? "—"}
                  {u.school && ` · ${u.school}`}
                  {u.grade && ` · ${u.grade}-р анги`}
                </div>
              </div>

              {u.role === "admin" || u.role === "superadmin" ? (
                <Badge className="text-[10px] shrink-0">Админ</Badge>
              ) : null}
            </button>
          ))
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Эрх тохируулах — {selected?.full_name ?? ""}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={isTeacher} onCheckedChange={(v) => setIsTeacher(!!v)} />
              <div>
                <p className="text-sm font-medium">Багш</p>
                <p className="text-xs text-muted-foreground">Ангид нийтлэл нэмэх, шалгалт оруулах эрх</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={canPost} onCheckedChange={(v) => setCanPost(!!v)} />
              <div>
                <p className="text-sm font-medium">Нийтлэл нийтлэх</p>
                <p className="text-xs text-muted-foreground">Медээ хэсэгт мэдээ нийтлэх</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={canComment} onCheckedChange={(v) => setCanComment(!!v)} />
              <div>
                <p className="text-sm font-medium">Сэтгэгдэл бичих</p>
                <p className="text-xs text-muted-foreground">Медээн дээр сэтгэгдэл үлдээх</p>
              </div>
            </label>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Шалгалтын хандалт</p>
                </div>
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={grantAllPaid}>
                    Бүгдийг олгох
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={clearAllAccess}>
                    Цэвэрлэх
                  </Button>
                </div>
              </div>

              {loadingExams ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : examSets.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Шалгалт байхгүй</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {examSets.map((exam) => {
                    const checked = exam.is_free || selectedExamIds.has(exam.id)
                    return (
                      <label
                        key={exam.id}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={exam.is_free}
                          onCheckedChange={(v) => toggleExam(exam.id, !!v)}
                        />
                        <span className="text-sm flex-1 truncate">{exam.title}</span>
                        {exam.is_free && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            Үнэгүй
                          </Badge>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={saving}>
              Болих
            </Button>
            <Button onClick={handleSave} disabled={saving || loadingExams}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

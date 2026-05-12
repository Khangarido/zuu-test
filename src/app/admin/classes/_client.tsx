"use client"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createClass, updateClass, deleteClass } from "./_actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Trash2, Pencil, Plus, Globe, Lock, Users, Loader2 } from "lucide-react"

type ClassRow = {
  id: string; name: string; slug: string; description: string | null
  is_public: boolean; member_count: number; created_at: string
}

export function AdminClassesClient({ classes: initial }: { classes: ClassRow[] }) {
  const [classes, setClasses] = useState(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null)
  const [delTarget, setDelTarget] = useState<ClassRow | null>(null)
  const [pending, startTransition] = useTransition()

  const [cName, setCName] = useState("")
  const [cSlug, setCSlug] = useState("")
  const [cDesc, setCDesc] = useState("")
  const [cPublic, setCPublic] = useState(true)
  const [eName, setEName] = useState("")
  const [eDesc, setEDesc] = useState("")
  const [ePublic, setEPublic] = useState(true)

  function autoSlug(name: string) {
    return name.toLowerCase()
      .replace(/[\s]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
  }

  function handleCreate() {
    if (!cName.trim() || !cSlug.trim()) { toast.error("Нэр болон slug шаардлагатай"); return }
    startTransition(async () => {
      const res = await createClass({ name: cName.trim(), slug: cSlug.trim(), description: cDesc, is_public: cPublic })
      if (res?.error) { toast.error(res.error); return }
      toast.success("Анги үүсгэгдлээ")
      setShowCreate(false)
      setCName(""); setCSlug(""); setCDesc(""); setCPublic(true)
      window.location.reload()
    })
  }

  function openEdit(cls: ClassRow) {
    setEditTarget(cls); setEName(cls.name); setEDesc(cls.description ?? ""); setEPublic(cls.is_public)
  }

  function handleEdit() {
    if (!editTarget || !eName.trim()) return
    startTransition(async () => {
      const res = await updateClass(editTarget.id, { name: eName.trim(), description: eDesc, is_public: ePublic })
      if (res?.error) { toast.error(res.error); return }
      toast.success("Шинэчлэгдлээ")
      setClasses(prev => prev.map(c => c.id === editTarget.id ? { ...c, name: eName, description: eDesc || null, is_public: ePublic } : c))
      setEditTarget(null)
    })
  }

  function handleDelete() {
    if (!delTarget) return
    startTransition(async () => {
      const res = await deleteClass(delTarget.id)
      if (res?.error) { toast.error(res.error); return }
      toast.success("Устгагдлаа")
      setClasses(prev => prev.filter(c => c.id !== delTarget.id))
      setDelTarget(null)
    })
  }

  const TA = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ангиуд</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{classes.length} анги нийт</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />Анги нэмэх
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card><CardContent className="py-20 text-center text-muted-foreground text-sm">
          Одоогоор анги байхгүй байна
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{cls.name}</CardTitle>
                  <Badge variant={cls.is_public ? "default" : "secondary"} className="shrink-0 text-xs">
                    {cls.is_public
                      ? <><Globe className="size-3 mr-1" />Нийтийн</>
                      : <><Lock className="size-3 mr-1" />Хаалттай</>}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">/{cls.slug}</p>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {cls.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{cls.description}</p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" />{cls.member_count ?? 0} гишүүн
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(cls)}>
                    <Pencil className="size-3.5 mr-1" />Засах
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => setDelTarget(cls)}>
                    <Trash2 className="size-3.5 mr-1" />Устгах
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Шинэ анги үүсгэх</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Ангийн нэр *</label>
              <Input value={cName} placeholder="Математик ангилал"
                onChange={e => { setCName(e.target.value); if (!cSlug) setCSlug(autoSlug(e.target.value)) }} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug (URL) *</label>
              <Input value={cSlug} placeholder="math-class" className="font-mono text-sm"
                onChange={e => setCSlug(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Тайлбар</label>
              <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} rows={2}
                placeholder="Ангийн тухай товч тайлбар..." className={TA} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cPublic} onChange={e => setCPublic(e.target.checked)}
                className="size-4 rounded accent-primary" />
              <span className="text-sm">Нийтийн анги</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Болих</Button>
            <Button onClick={handleCreate} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin mr-1" />}Үүсгэх
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Анги засах</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Ангийн нэр *</label>
              <Input value={eName} onChange={e => setEName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Тайлбар</label>
              <textarea value={eDesc} onChange={e => setEDesc(e.target.value)} rows={2} className={TA} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={ePublic} onChange={e => setEPublic(e.target.checked)}
                className="size-4 rounded accent-primary" />
              <span className="text-sm">Нийтийн анги</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Болих</Button>
            <Button onClick={handleEdit} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin mr-1" />}Хадгалах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!delTarget} onOpenChange={o => !o && setDelTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Анги устгах уу?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{delTarget?.name}</strong> ангийг устгахдаа итгэлтэй байна уу?
            Энэ үйлдлийг буцаах боломжгүй.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelTarget(null)}>Болих</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin mr-1" />}Устгах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useMemo, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Heart, Trash2, Plus, BookOpen, Clock, Loader2, Users, ImageIcon, X,
} from "lucide-react"

/* ── Types ───────────────────────────────────────────────────────────────── */

type Profile = { full_name: string | null; username: string | null; avatar_url: string | null } | null

type ClassPost = {
  id: string; title: string; body: string; photo_url: string | null
  created_at: string; author_id: string; profiles: Profile
  reaction_count: number; reacted: boolean
}
type ClassExam = { id: string; exam_set_id: string; title: string; duration_minutes: number }
type ClassMember = {
  user_id: string; role: string
  full_name: string | null; username: string | null; avatar_url: string | null; rank_tier: string | null
}
type ExamSetOption = { id: string; title: string; duration_minutes: number }

type Props = {
  cls: { id: string; name: string; slug: string; is_private: boolean }
  currentUserId: string
  isTeacher: boolean
  isAdmin: boolean
  isMember: boolean
  initialPosts: ClassPost[]
  initialExams: ClassExam[]
  initialMembers: ClassMember[]
  myReactionPostIds: string[]
  reactionCounts: Record<string, number>
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function relativeTime(d: string) {
  try {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (s < 60) return `${s}с өмнө`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}м өмнө`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}ц өмнө`
    return `${Math.floor(h / 24)}х өмнө`
  } catch { return "" }
}
function initials(n: string) {
  return n.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("")
}

const TA = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/* ── Component ───────────────────────────────────────────────────────────── */

export function ClassDetailClient({
  cls, currentUserId, isTeacher, isAdmin, isMember,
  initialPosts, initialExams, initialMembers,
  myReactionPostIds, reactionCounts,
}: Props) {
  const supabase = useMemo(() => createClient(), [])

  // Attach reaction state to posts
  const reactedSet = useMemo(() => new Set(myReactionPostIds), [myReactionPostIds])
  const [posts, setPosts] = useState<ClassPost[]>(() =>
    initialPosts.map(p => ({
      ...p,
      reaction_count: reactionCounts[p.id] ?? 0,
      reacted: reactedSet.has(p.id),
    }))
  )
  const [exams, setExams] = useState<ClassExam[]>(initialExams)
  const members = initialMembers

  /* ── Create post dialog ── */
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }
  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleCreatePost() {
    const title = newTitle.trim()
    const body = newBody.trim()
    if (!title || !body) return
    setPosting(true)

    let photoUrl: string | null = null
    if (photoFile) {
      const path = `${cls.id}/${Date.now()}-${photoFile.name.replace(/\s+/g, "_")}`
      const { data: storeData, error: storeErr } = await supabase.storage
        .from("class-photos")
        .upload(path, photoFile, { cacheControl: "3600", upsert: false })
      if (!storeErr && storeData?.path) {
        photoUrl = supabase.storage.from("class-photos").getPublicUrl(storeData.path).data.publicUrl
      }
    }

    const { data, error } = await supabase
      .from("class_posts")
      .insert({ class_id: cls.id, author_id: currentUserId, title, body, photo_url: photoUrl })
      .select("id, title, body, photo_url, created_at, author_id, profiles!author_id(full_name, username, avatar_url)")
      .single()

    if (error) { toast.error("Нийтлэхэд алдаа гарлаа"); setPosting(false); return }

    // Notify all class members (except self)
    const { data: classMembers } = await supabase.from("class_members").select("user_id").eq("class_id", cls.id)
    const targets = (classMembers ?? []).map((m: any) => m.user_id as string).filter(id => id !== currentUserId)
    if (targets.length > 0) {
      await supabase.from("notifications").insert(
        targets.map(uid => ({
          user_id: uid, type: "class_post",
          title: `${cls.name} - шинэ нийтлэл`,
          body: title, link: `/classes/${cls.slug}`,
        }))
      )
    }

    const pr = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
    setPosts(prev => [{
      id: data.id, title: data.title, body: data.body,
      photo_url: data.photo_url ?? null, created_at: data.created_at,
      author_id: data.author_id,
      profiles: pr ? { full_name: pr.full_name ?? null, username: pr.username ?? null, avatar_url: pr.avatar_url ?? null } : null,
      reaction_count: 0, reacted: false,
    }, ...prev])

    setNewTitle(""); setNewBody(""); clearPhoto(); setShowCreatePost(false)
    setPosting(false)
    toast.success("Нийтлэл нэмэгдлээ")
  }

  async function handleDeletePost(postId: string) {
    const { error } = await supabase.from("class_posts").delete().eq("id", postId)
    if (error) { toast.error("Устгах боломжгүй байна"); return }
    setPosts(prev => prev.filter(p => p.id !== postId))
    toast.success("Нийтлэл устгагдлаа")
  }

  async function handleReact(post: ClassPost) {
    const nowReacted = !post.reacted
    const delta = nowReacted ? 1 : -1
    setPosts(prev => prev.map(p =>
      p.id === post.id ? { ...p, reacted: nowReacted, reaction_count: Math.max(0, p.reaction_count + delta) } : p
    ))
    if (nowReacted) {
      await supabase.from("class_post_reactions").insert({ post_id: post.id, user_id: currentUserId })
    } else {
      await supabase.from("class_post_reactions").delete().eq("post_id", post.id).eq("user_id", currentUserId)
    }
  }

  /* ── Add exam dialog ── */
  const [showAddExam, setShowAddExam] = useState(false)
  const [allExamSets, setAllExamSets] = useState<ExamSetOption[]>([])
  const [loadingExamSets, setLoadingExamSets] = useState(false)
  const [selectedExamSetId, setSelectedExamSetId] = useState("")
  const [addingExam, setAddingExam] = useState(false)

  async function openAddExamDialog() {
    setShowAddExam(true)
    if (allExamSets.length === 0) {
      setLoadingExamSets(true)
      const { data } = await supabase
        .from("exam_sets").select("id, title, duration_minutes").eq("is_active", true).order("title")
      setAllExamSets(data ?? [])
      setLoadingExamSets(false)
    }
  }

  async function handleAddExam() {
    if (!selectedExamSetId) return
    setAddingExam(true)
    const { data: insertedExam, error } = await supabase
      .from("class_exams")
      .insert({ class_id: cls.id, exam_set_id: selectedExamSetId, created_by: currentUserId })
      .select("id")
      .single()
    if (error) { toast.error("Шалгалт нэмэхэд алдаа гарлаа"); setAddingExam(false); return }

    const examInfo = allExamSets.find(e => e.id === selectedExamSetId)

    // Notify members
    const { data: classMembers } = await supabase.from("class_members").select("user_id").eq("class_id", cls.id)
    const targets = (classMembers ?? []).map((m: any) => m.user_id as string).filter(id => id !== currentUserId)
    if (targets.length > 0) {
      await supabase.from("notifications").insert(
        targets.map(uid => ({
          user_id: uid, type: "class_exam",
          title: `${cls.name} - шинэ шалгалт`,
          body: examInfo?.title ?? null, link: `/classes/${cls.slug}`,
        }))
      )
    }

    setExams(prev => [...prev, {
      id: insertedExam.id,
      exam_set_id: selectedExamSetId,
      title: examInfo?.title ?? "Шалгалт",
      duration_minutes: examInfo?.duration_minutes ?? 0,
    }])
    setSelectedExamSetId(""); setShowAddExam(false); setAddingExam(false)
    toast.success("Шалгалт нэмэгдлээ")
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: Posts feed ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Create post button (teacher, < 10 posts) */}
          {isTeacher && posts.length < 10 && (
            <Button
              onClick={() => setShowCreatePost(true)}
              className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
            >
              <Plus className="size-4" />Нийтлэл нэмэх
            </Button>
          )}
          {isTeacher && posts.length >= 10 && (
            <p className="text-center text-sm text-muted-foreground py-2">Нийтлэлийн хязгаарт хүрлээ (10/10)</p>
          )}

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <BookOpen className="size-8 mx-auto mb-2 opacity-25" />
              Одоогоор нийтлэл байхгүй байна
            </div>
          ) : posts.map(post => {
            const name = post.profiles?.full_name ?? post.profiles?.username ?? "Хэрэглэгч"
            const canDelete = post.author_id === currentUserId || isAdmin

            return (
              <Card key={post.id}>
                <CardContent className="pt-4 pb-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold">
                        {initials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          {post.profiles?.username
                            ? <Link href={`/profile/${post.profiles.username}`} className="font-semibold text-sm hover:underline">{name}</Link>
                            : <span className="font-semibold text-sm">{name}</span>}
                          <span className="text-xs text-muted-foreground">{relativeTime(post.created_at)}</span>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer ml-2 shrink-0"
                            aria-label="Устгах"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm font-semibold mt-1 leading-snug">{post.title}</p>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap leading-relaxed text-muted-foreground">{post.body}</p>
                    </div>
                  </div>

                  {/* Photo */}
                  {post.photo_url && (
                    <div className="rounded-xl overflow-hidden border border-border/60 ml-12">
                      <Image
                        src={post.photo_url} alt={post.title}
                        width={800} height={450}
                        className="w-full object-cover max-h-72"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Reaction */}
                  {isMember && (
                    <div className="pl-12">
                      <button
                        onClick={() => handleReact(post)}
                        className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                          post.reacted ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
                        }`}
                      >
                        <Heart className={`size-4 ${post.reacted ? "fill-rose-500" : ""}`} />
                        {post.reaction_count > 0 ? post.reaction_count : ""}
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* ── Right column: Exams + Members ── */}
        <div className="space-y-6">

          {/* Exams */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-1.5">
                <BookOpen className="size-4 text-muted-foreground" />Шалгалтууд
              </h2>
              {isTeacher && exams.length < 10 && (
                <button
                  onClick={openAddExamDialog}
                  className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="size-3" />Нэмэх
                </button>
              )}
            </div>

            {isTeacher && exams.length >= 10 && (
              <p className="text-xs text-muted-foreground">Шалгалтын хязгаарт хүрлээ (10/10)</p>
            )}

            {exams.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  <BookOpen className="size-6 mx-auto mb-2 opacity-25" />
                  Шалгалт байхгүй
                </CardContent>
              </Card>
            ) : exams.map(exam => (
              <Card key={exam.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{exam.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="size-3" />{exam.duration_minutes} минут
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild className="shrink-0">
                      <Link href={`/exam/${exam.exam_set_id}`}>Шалгалт өгөх</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Members (teacher only) */}
          {isTeacher && (
            <div className="space-y-2">
              <h2 className="font-semibold text-sm flex items-center gap-1.5">
                <Users className="size-4 text-muted-foreground" />Сурагчид
                <Badge variant="secondary" className="text-xs ml-1">{members.length}</Badge>
              </h2>
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Гишүүн байхгүй</p>
              ) : members.map(m => {
                const name = m.full_name ?? m.username ?? "Хэрэглэгч"
                return (
                  <div key={m.user_id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-accent transition-colors">
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[10px] font-bold">
                        {initials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      {m.username
                        ? <Link href={`/profile/${m.username}`} className="text-xs font-semibold hover:underline truncate block">{name}</Link>
                        : <span className="text-xs font-semibold truncate block">{name}</span>}
                      {m.rank_tier && <p className="text-[10px] text-muted-foreground">{m.rank_tier}</p>}
                    </div>
                    {m.role === "teacher"
                      ? <Badge className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-0 shrink-0">Багш</Badge>
                      : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Post Dialog ── */}
      <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Нийтлэл нэмэх</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Гарчиг (заавал)"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <textarea
              value={newBody}
              rows={4}
              onChange={e => setNewBody(e.target.value)}
              placeholder="Нийтлэлийн агуулга (заавал)"
              className={TA}
            />
            {/* Photo */}
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border/60">
                <img src={photoPreview} alt="preview" className="w-full max-h-48 object-cover" />
                <button
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 size-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ImageIcon className="size-4" />Зураг нэмэх (заавал биш)
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePost(false)}>Болих</Button>
            <Button onClick={handleCreatePost} disabled={posting || !newTitle.trim() || !newBody.trim()}>
              {posting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Нийтлэх
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Exam Dialog ── */}
      <Dialog open={showAddExam} onOpenChange={setShowAddExam}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Шалгалт нэмэх</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {loadingExamSets ? (
              <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : allExamSets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Нэмэх боломжтой шалгалт байхгүй</p>
            ) : (
              <select
                value={selectedExamSetId}
                onChange={e => setSelectedExamSetId(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— Шалгалт сонгох —</option>
                {allExamSets
                  .filter(es => !exams.some(e => e.exam_set_id === es.id))
                  .map(es => (
                    <option key={es.id} value={es.id}>
                      {es.title} ({es.duration_minutes} мин)
                    </option>
                  ))}
              </select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExam(false)}>Болих</Button>
            <Button onClick={handleAddExam} disabled={addingExam || !selectedExamSetId}>
              {addingExam && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Нэмэх
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Heart, MessageCircle, MoreHorizontal, Trash2, Pencil,
  Send, Loader2, Megaphone, ImageIcon, X, ExternalLink,
} from "lucide-react"

/* ── Types ───────────────────────────────────────────────────────────────── */

type MedeePost = {
  id: string
  title: string
  body: string
  photo_url: string | null
  link_url: string | null
  mention_all: boolean
  created_at: string
  author_id: string
  profiles: { username: string | null; full_name: string | null; avatar_url: string | null } | null
  reaction_count: number
  comment_count: number
  reacted: boolean
}

type MedeeComment = {
  id: string
  body: string
  created_at: string
  author_id: string
  profiles: { username: string | null; full_name: string | null; avatar_url: string | null } | null
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
const TA_SM = "flex w-full rounded border border-input bg-background px-2 py-1 text-xs shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const INPUT = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/* ── Component ───────────────────────────────────────────────────────────── */

export function MedeeFeed({
  currentUserId,
  canPost,
  canComment,
  isAdmin = false,
}: {
  currentUserId: string
  canPost: boolean
  canComment: boolean
  isAdmin?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])

  const [posts, setPosts] = useState<MedeePost[]>([])
  const [loading, setLoading] = useState(true)

  /* ── Create post state ── */
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null)
  const [mentionAll, setMentionAll] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const newPhotoRef = useRef<HTMLInputElement>(null)

  /* ── Edit post state ── */
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editLinkUrl, setEditLinkUrl] = useState("")
  const [editingPost, setEditingPost] = useState(false)

  /* ── Comments state ── */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [postComments, setPostComments] = useState<Record<string, MedeeComment[]>>({})
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({})

  /* ── Edit comment state ── */
  const [editCommentId, setEditCommentId] = useState<string | null>(null)
  const [editCommentBody, setEditCommentBody] = useState("")
  const [editingComment, setEditingComment] = useState(false)

  /* ── Photo helpers ── */
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview)
    setNewPhotoFile(file)
    setNewPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview)
    setNewPhotoFile(null)
    setNewPhotoPreview(null)
    if (newPhotoRef.current) newPhotoRef.current.value = ""
  }

  /* ── Fetch posts ─────────────────────────────────────────────────────── */
  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("medee_posts")
      .select(`
        id, title, body, photo_url, link_url, mention_all, created_at, author_id,
        profiles!author_id(username, full_name, avatar_url),
        reaction_count:medee_reactions(count),
        comment_count:medee_comments(count)
      `)
      .order("created_at", { ascending: false })
      .limit(40)

    if (error) { toast.error("Мэдээ ачааллахад алдаа гарлаа"); setLoading(false); return }

    const rows = data ?? []
    const ids = rows.map((p: any) => p.id as string)

    let reactedSet = new Set<string>()
    if (ids.length > 0) {
      const { data: myReactions } = await supabase
        .from("medee_reactions")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", ids)
      reactedSet = new Set((myReactions ?? []).map((r: any) => r.post_id as string))
    }

    setPosts(rows.map((p: any) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      photo_url: p.photo_url ?? null,
      link_url: p.link_url ?? null,
      mention_all: p.mention_all ?? false,
      created_at: p.created_at,
      author_id: p.author_id,
      profiles: Array.isArray(p.profiles) ? (p.profiles[0] ?? null) : (p.profiles ?? null),
      reaction_count: (Array.isArray(p.reaction_count) ? p.reaction_count[0]?.count : p.reaction_count) ?? 0,
      comment_count: (Array.isArray(p.comment_count) ? p.comment_count[0]?.count : p.comment_count) ?? 0,
      reacted: reactedSet.has(p.id),
    })))
    setLoading(false)
  }, [supabase, currentUserId])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  /* ── Create post ─────────────────────────────────────────────────────── */
  async function handleCreatePost() {
    const title = newTitle.trim()
    const body = newBody.trim()
    if (!title || !body) return
    setSubmitting(true)

    let photoUrl: string | null = null
    if (newPhotoFile) {
      const fileName = `${Date.now()}_${newPhotoFile.name.replace(/\s+/g, "_")}`
      const { data: storeData, error: storeErr } = await supabase.storage
        .from("medee-photos")
        .upload(fileName, newPhotoFile, { upsert: true })
      if (!storeErr && storeData?.path) {
        photoUrl = supabase.storage.from("medee-photos").getPublicUrl(storeData.path).data.publicUrl
      }
    }

    const { error } = await supabase.from("medee_posts").insert({
      title,
      body,
      author_id: currentUserId,
      photo_url: photoUrl,
      link_url: newLinkUrl.trim() || null,
      mention_all: mentionAll,
    })
    setSubmitting(false)
    if (error) { toast.error("Нийтлэхэд алдаа гарлаа"); return }
    setNewTitle(""); setNewBody(""); setNewLinkUrl(""); clearPhoto(); setMentionAll(false)
    toast.success("Мэдээ нийтлэгдлээ")
    fetchPosts()
  }

  /* ── Edit post ───────────────────────────────────────────────────────── */
  function openEditPost(post: MedeePost) {
    setEditPostId(post.id)
    setEditTitle(post.title)
    setEditBody(post.body)
    setEditLinkUrl(post.link_url ?? "")
  }

  async function handleEditPost(postId: string) {
    const title = editTitle.trim()
    const body = editBody.trim()
    if (!title || !body) return
    setEditingPost(true)
    const { error } = await supabase.from("medee_posts")
      .update({ title, body, link_url: editLinkUrl.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", postId)
    setEditingPost(false)
    if (error) { toast.error("Засах боломжгүй байна"); return }
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, title, body, link_url: editLinkUrl.trim() || null } : p
    ))
    setEditPostId(null)
    toast.success("Мэдээ шинэчлэгдлээ")
  }

  /* ── Delete post ─────────────────────────────────────────────────────── */
  async function handleDeletePost(postId: string) {
    const { error } = await supabase.from("medee_posts").delete().eq("id", postId)
    if (error) { toast.error("Устгах боломжгүй байна"); return }
    setPosts(prev => prev.filter(p => p.id !== postId))
    toast.success("Мэдээ устгагдлаа")
  }

  /* ── React / unreact ─────────────────────────────────────────────────── */
  async function handleReact(post: MedeePost) {
    const nowReacted = !post.reacted
    const delta = nowReacted ? 1 : -1
    setPosts(prev => prev.map(p =>
      p.id === post.id
        ? { ...p, reacted: nowReacted, reaction_count: Math.max(0, p.reaction_count + delta) }
        : p
    ))
    if (nowReacted) {
      await supabase.from("medee_reactions").insert({ post_id: post.id, user_id: currentUserId })
    } else {
      await supabase.from("medee_reactions").delete().eq("post_id", post.id).eq("user_id", currentUserId)
    }
  }

  /* ── Comments ────────────────────────────────────────────────────────── */
  async function toggleComments(postId: string) {
    const next = new Set(expanded)
    if (next.has(postId)) {
      next.delete(postId)
    } else {
      next.add(postId)
      if (!postComments[postId]) {
        setCommentLoading(prev => ({ ...prev, [postId]: true }))
        const { data } = await supabase
          .from("medee_comments")
          .select("id, body, created_at, author_id, profiles!author_id(username, full_name, avatar_url)")
          .eq("post_id", postId)
          .order("created_at", { ascending: true })
        setPostComments(prev => ({
          ...prev,
          [postId]: (data ?? []).map((c: any) => ({
            ...c,
            profiles: Array.isArray(c.profiles) ? (c.profiles[0] ?? null) : (c.profiles ?? null),
          })),
        }))
        setCommentLoading(prev => ({ ...prev, [postId]: false }))
      }
    }
    setExpanded(next)
  }

  async function handleCreateComment(postId: string) {
    const text = (newComment[postId] ?? "").trim()
    if (!text) return
    setCommentSubmitting(prev => ({ ...prev, [postId]: true }))
    const { data, error } = await supabase
      .from("medee_comments")
      .insert({ post_id: postId, author_id: currentUserId, body: text })
      .select("id, body, created_at, author_id, profiles!author_id(username, full_name, avatar_url)")
      .single()
    setCommentSubmitting(prev => ({ ...prev, [postId]: false }))
    if (error) { toast.error("Алдаа гарлаа"); return }
    const c: MedeeComment = {
      ...data,
      profiles: Array.isArray(data.profiles) ? (data.profiles[0] ?? null) : (data.profiles ?? null),
    }
    setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), c] }))
    setNewComment(prev => ({ ...prev, [postId]: "" }))
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
  }

  async function handleEditComment(commentId: string, postId: string) {
    const body = editCommentBody.trim()
    if (!body) return
    setEditingComment(true)
    const { error } = await supabase.from("medee_comments").update({ body }).eq("id", commentId)
    setEditingComment(false)
    if (error) { toast.error("Засах боломжгүй байна"); return }
    setPostComments(prev => ({
      ...prev,
      [postId]: (prev[postId] ?? []).map(c => c.id === commentId ? { ...c, body } : c),
    }))
    setEditCommentId(null)
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    const { error } = await supabase.from("medee_comments").delete().eq("id", commentId)
    if (error) { toast.error("Устгах боломжгүй байна"); return }
    setPostComments(prev => ({ ...prev, [postId]: (prev[postId] ?? []).filter(c => c.id !== commentId) }))
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p))
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* ── Create post form (canPost only) ── */}
      {canPost && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Гарчиг..."
              className={`${INPUT} font-semibold`}
            />
            <textarea
              value={newBody}
              rows={4}
              onChange={e => setNewBody(e.target.value)}
              placeholder="Мэдээний агуулга..."
              className={TA}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCreatePost() }}
            />

            {/* Link field */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Холбоос (заавал биш)</label>
              <input
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                placeholder="https://..."
                className={INPUT}
              />
            </div>

            {/* Photo preview or upload button */}
            {newPhotoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border/60">
                <img src={newPhotoPreview} alt="preview" className="w-full max-h-48 object-cover" />
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
                onClick={() => newPhotoRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ImageIcon className="size-4" />Зураг оруулах
              </button>
            )}
            <input
              ref={newPhotoRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMentionAll(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                  mentionAll
                    ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Megaphone className="size-3.5" />Бүгдэд
              </button>
              <Button
                size="sm"
                onClick={handleCreatePost}
                disabled={submitting || !newTitle.trim() || !newBody.trim()}
              >
                {submitting ? <Loader2 className="size-4 animate-spin mr-1" /> : <Send className="size-4 mr-1" />}
                Нийтлэх
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Feed ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Одоогоор мэдээ байхгүй байна
        </div>
      ) : posts.map(post => {
        const prof = post.profiles
        const name = prof?.full_name ?? prof?.username ?? "Хэрэглэгч"
        const canManagePost = post.author_id === currentUserId || isAdmin
        const isEditingThis = editPostId === post.id
        const comments = postComments[post.id] ?? []
        const isOpen = expanded.has(post.id)

        return (
          <Card key={post.id} className={post.mention_all ? "border-amber-300/60 dark:border-amber-700/40" : ""}>
            <CardContent className="pt-4 pb-4 space-y-3">

              {/* mention_all banner */}
              {post.mention_all && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-1.5">
                  <Megaphone className="size-3.5" />
                  Бүх хэрэглэгчдэд зориулсан мэдэгдэл
                </div>
              )}

              {/* ── Author row ── */}
              <div className="flex items-start gap-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={prof?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      {prof?.username
                        ? <Link href={`/profile/${prof.username}`} className="font-semibold text-sm hover:underline">{name}</Link>
                        : <span className="font-semibold text-sm">{name}</span>}
                      {prof?.username && (
                        <span className="text-xs text-muted-foreground">@{prof.username}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{relativeTime(post.created_at)}</span>
                    </div>
                    {canManagePost && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 shrink-0 -mr-1 cursor-pointer">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditPost(post)} className="cursor-pointer">
                            <Pencil className="size-4 mr-2" />Засах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="size-4 mr-2" />Устгах
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* ── Inline edit form OR content ── */}
                  {isEditingThis ? (
                    <div className="mt-2 space-y-2">
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className={`${INPUT} font-semibold`}
                        placeholder="Гарчиг"
                      />
                      <textarea
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        rows={4}
                        className={TA}
                        placeholder="Агуулга"
                      />
                      <input
                        value={editLinkUrl}
                        onChange={e => setEditLinkUrl(e.target.value)}
                        className={INPUT}
                        placeholder="Холбоос (заавал биш)"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditPost(post.id)}
                          disabled={editingPost || !editTitle.trim() || !editBody.trim()}
                        >
                          {editingPost && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                          Хадгалах
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditPostId(null)}>
                          Болих
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Title — larger, bold */}
                      <p className="text-lg font-bold mt-1 leading-snug">{post.title}</p>
                      {/* Body — normal weight */}
                      <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed text-foreground">
                        {post.body}
                      </p>
                      {/* Link */}
                      {post.link_url && (
                        <a
                          href={post.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 mt-1 hover:opacity-80 transition-opacity"
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          <span className="truncate">{post.link_url}</span>
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Photo */}
              {!isEditingThis && post.photo_url && (
                <div className="rounded-xl overflow-hidden border border-border/60 ml-12">
                  <Image
                    src={post.photo_url}
                    alt={post.title}
                    width={800}
                    height={450}
                    className="w-full object-cover max-h-72"
                    unoptimized
                  />
                </div>
              )}

              {/* Actions */}
              {!isEditingThis && (
                <div className="flex items-center gap-4 pl-12">
                  <button
                    onClick={() => handleReact(post)}
                    className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                      post.reacted ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
                    }`}
                  >
                    <Heart className={`size-4 ${post.reacted ? "fill-rose-500" : ""}`} />
                    {post.reaction_count > 0 ? post.reaction_count : ""}
                  </button>
                  <button
                    onClick={() => {
                      if (!canComment && !isOpen) {
                        toast("Сэтгэгдэл үлдээх эрх байхгүй байна", { description: "Унших боломжтой." })
                      }
                      toggleComments(post.id)
                    }}
                    className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                      isOpen ? "text-primary" : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <MessageCircle className="size-4" />
                    {post.comment_count > 0 ? post.comment_count : "Сэтгэгдэл"}
                  </button>
                </div>
              )}

              {/* ── Comments section ── */}
              {!isEditingThis && isOpen && (
                <div className="pl-12 space-y-3 border-t pt-3">
                  {commentLoading[post.id] ? (
                    <div className="flex justify-center py-3">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Сэтгэгдэл байхгүй</p>
                  ) : comments.map(c => {
                    const cp = c.profiles
                    const cn = cp?.full_name ?? cp?.username ?? "Хэрэглэгч"
                    const canManageComment = c.author_id === currentUserId || canPost
                    const isEditingComment = editCommentId === c.id
                    return (
                      <div key={c.id} className="flex items-start gap-2">
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={cp?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[10px] font-bold">
                            {initials(cn)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 bg-muted rounded-xl px-3 py-2">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              {cp?.username
                                ? <Link href={`/profile/${cp.username}`} className="text-xs font-semibold hover:underline">{cn}</Link>
                                : <span className="text-xs font-semibold">{cn}</span>}
                              {cp?.username && (
                                <span className="text-[10px] text-muted-foreground">@{cp.username}</span>
                              )}
                              <span className="text-[10px] text-muted-foreground">{relativeTime(c.created_at)}</span>
                            </div>
                            {canManageComment && !isEditingComment && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-5 shrink-0 -mr-1 -mt-0.5 cursor-pointer">
                                    <MoreHorizontal className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {c.author_id === currentUserId && (
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() => { setEditCommentId(c.id); setEditCommentBody(c.body) }}
                                    >
                                      <Pencil className="size-3.5 mr-2" />Засах
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                    onClick={() => handleDeleteComment(c.id, post.id)}
                                  >
                                    <Trash2 className="size-3.5 mr-2" />Устгах
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          {/* Inline comment edit */}
                          {isEditingComment ? (
                            <div className="mt-1.5 space-y-1.5">
                              <textarea
                                value={editCommentBody}
                                onChange={e => setEditCommentBody(e.target.value)}
                                rows={2}
                                className={TA_SM}
                              />
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-6 text-xs px-2.5"
                                  onClick={() => handleEditComment(c.id, post.id)}
                                  disabled={editingComment || !editCommentBody.trim()}
                                >
                                  {editingComment ? <Loader2 className="size-3 animate-spin" /> : "Хадгалах"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs px-2.5"
                                  onClick={() => setEditCommentId(null)}
                                >
                                  Болих
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs mt-0.5 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Comment input — canComment users only */}
                  {canComment ? (
                    <div className="flex gap-2 items-start pt-1">
                      <div className="flex-1">
                        <textarea
                          value={newComment[post.id] ?? ""}
                          onChange={e => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Сэтгэгдэл бичих... (Ctrl+Enter)"
                          rows={2}
                          className={TA_SM}
                          onKeyDown={e => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCreateComment(post.id)
                          }}
                        />
                      </div>
                      <Button
                        size="sm" className="mt-0.5 shrink-0"
                        disabled={!(newComment[post.id] ?? "").trim() || commentSubmitting[post.id]}
                        onClick={() => handleCreateComment(post.id)}
                      >
                        {commentSubmitting[post.id]
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : <Send className="size-3.5" />}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic text-center py-1">
                      Сэтгэгдэл үлдээх эрх байхгүй байна
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

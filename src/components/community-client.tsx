"use client"
import { useState, useCallback, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Heart, MessageCircle, MoreHorizontal, Pencil, Trash2, Send, Loader2 } from "lucide-react"

type Profile = { username: string | null; full_name: string | null; avatar_url: string | null }
type Post = {
  id: string; content: string; created_at: string
  likes_count: number; user_id: string
  profiles: Profile | null; liked: boolean
}
type Comment = {
  id: string; content: string; created_at: string
  user_id: string; profiles: Profile | null
}

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

export function CommunityFeed({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [editCommentId, setEditCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState("")
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("posts")
      .select("id, content, created_at, likes_count, user_id, profiles!user_id(username, full_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(40)
    if (data) {
      const ids = data.map((p: any) => p.id)
      let likedSet = new Set<string>()
      if (ids.length > 0) {
        const { data: likes } = await supabase
          .from("post_likes").select("post_id")
          .eq("user_id", currentUserId).in("post_id", ids)
        likedSet = new Set((likes ?? []).map((l: any) => l.post_id))
      }
      setPosts(data.map((p: any) => ({
        ...p,
        profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
        liked: likedSet.has(p.id),
      })))
    }
    setLoading(false)
  }, [supabase, currentUserId])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleCreatePost() {
    if (!newContent.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from("posts").insert({ content: newContent.trim(), user_id: currentUserId })
    setSubmitting(false)
    if (error) { toast.error("Алдаа гарлаа"); return }
    setNewContent("")
    fetchPosts()
  }

  async function handleEditPost(postId: string) {
    if (!editContent.trim()) return
    const { error } = await supabase.from("posts").update({ content: editContent.trim() }).eq("id", postId)
    if (error) { toast.error("Засах боломжгүй байна"); return }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent.trim() } : p))
    setEditPostId(null)
  }

  async function handleDeletePost(postId: string) {
    const { error } = await supabase.from("posts").delete().eq("id", postId)
    if (error) { toast.error("Устгах боломжгүй байна"); return }
    setPosts(prev => prev.filter(p => p.id !== postId))
    toast.success("Нийтлэл устгагдлаа")
  }

  async function handleLike(post: Post) {
    const newLiked = !post.liked
    const newCount = post.likes_count + (newLiked ? 1 : -1)
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked: newLiked, likes_count: newCount } : p))
    if (newLiked) {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId })
    } else {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId)
    }
    await supabase.from("posts").update({ likes_count: newCount }).eq("id", post.id)
  }

  async function toggleComments(postId: string) {
    const next = new Set(expanded)
    if (next.has(postId)) { next.delete(postId) } else {
      next.add(postId)
      if (!postComments[postId]) {
        setCommentLoading(prev => ({ ...prev, [postId]: true }))
        const { data } = await supabase
          .from("comments")
          .select("id, content, created_at, user_id, profiles!user_id(username, full_name, avatar_url)")
          .eq("post_id", postId).order("created_at", { ascending: true })
        setPostComments(prev => ({
          ...prev,
          [postId]: (data ?? []).map((c: any) => ({
            ...c, profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
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
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: currentUserId, content: text })
      .select("id, content, created_at, user_id, profiles!user_id(username, full_name, avatar_url)")
      .single()
    if (error) { toast.error("Алдаа гарлаа"); return }
    const c = { ...data, profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles }
    setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), c] }))
    setNewComment(prev => ({ ...prev, [postId]: "" }))
  }

  async function handleEditComment(commentId: string, postId: string) {
    if (!editCommentText.trim()) return
    const { error } = await supabase.from("comments").update({ content: editCommentText.trim() }).eq("id", commentId)
    if (error) { toast.error("Засах боломжгүй байна"); return }
    setPostComments(prev => ({
      ...prev,
      [postId]: (prev[postId] ?? []).map(c => c.id === commentId ? { ...c, content: editCommentText.trim() } : c),
    }))
    setEditCommentId(null)
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    const { error } = await supabase.from("comments").delete().eq("id", commentId)
    if (error) { toast.error("Устгах боломжгүй байна"); return }
    setPostComments(prev => ({ ...prev, [postId]: (prev[postId] ?? []).filter(c => c.id !== commentId) }))
  }

  return (
    <div className="space-y-4">
      {/* Create post */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <textarea
            value={newContent} rows={3}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Юу бодож байна вэ? Нийтлэл бичих... (Ctrl+Enter)"
            className={TA}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCreatePost() }}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreatePost} disabled={submitting || !newContent.trim()}>
              {submitting ? <Loader2 className="size-4 animate-spin mr-1" /> : <Send className="size-4 mr-1" />}
              Нийтлэх
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Одоогоор нийтлэл байхгүй байна</div>
      ) : posts.map(post => {
        const prof = post.profiles
        const name = prof?.full_name ?? prof?.username ?? "Хэрэглэгч"
        const canEdit = post.user_id === currentUserId
        const canDelete = post.user_id === currentUserId || isAdmin
        const comments = postComments[post.id] ?? []
        const isOpen = expanded.has(post.id)

        return (
          <Card key={post.id}>
            <CardContent className="pt-4 pb-4 space-y-3">
              {/* Post header */}
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
                      <span className="text-xs text-muted-foreground">{relativeTime(post.created_at)}</span>
                    </div>
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 shrink-0 -mr-1">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => { setEditPostId(post.id); setEditContent(post.content) }}>
                              <Pencil className="size-4 mr-2" />Засах
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeletePost(post.id)}>
                              <Trash2 className="size-4 mr-2" />Устгах
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {editPostId === post.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} className={TA} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditPost(post.id)}>Хадгалах</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditPostId(null)}>Болих</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pl-12">
                <button onClick={() => handleLike(post)}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${post.liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"}`}>
                  <Heart className={`size-4 ${post.liked ? "fill-rose-500" : ""}`} />
                  {post.likes_count > 0 ? post.likes_count : ""}
                </button>
                <button onClick={() => toggleComments(post.id)}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${isOpen ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                  <MessageCircle className="size-4" />
                  {comments.length > 0 ? comments.length : "Сэтгэгдэл"}
                </button>
              </div>

              {/* Comments */}
              {isOpen && (
                <div className="pl-12 space-y-3 border-t pt-3">
                  {commentLoading[post.id] ? (
                    <div className="flex justify-center py-3"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Сэтгэгдэл байхгүй</p>
                  ) : comments.map(c => {
                    const cp = c.profiles
                    const cn = cp?.full_name ?? cp?.username ?? "Хэрэглэгч"
                    const canEditC = c.user_id === currentUserId
                    const canDeleteC = c.user_id === currentUserId || isAdmin
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
                              <span className="text-[10px] text-muted-foreground">{relativeTime(c.created_at)}</span>
                            </div>
                            {(canEditC || canDeleteC) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-5 shrink-0 -mr-1 -mt-0.5">
                                    <MoreHorizontal className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEditC && (
                                    <DropdownMenuItem onClick={() => { setEditCommentId(c.id); setEditCommentText(c.content) }}>
                                      <Pencil className="size-3.5 mr-2" />Засах
                                    </DropdownMenuItem>
                                  )}
                                  {canDeleteC && (
                                    <DropdownMenuItem className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteComment(c.id, post.id)}>
                                      <Trash2 className="size-3.5 mr-2" />Устгах
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          {editCommentId === c.id ? (
                            <div className="mt-1 space-y-1.5">
                              <textarea value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                                rows={2} className={TA_SM} />
                              <div className="flex gap-1">
                                <Button size="sm" className="h-6 text-xs px-2"
                                  onClick={() => handleEditComment(c.id, post.id)}>Хадгалах</Button>
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                  onClick={() => setEditCommentId(null)}>Болих</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs mt-0.5 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* New comment */}
                  <div className="flex gap-2 items-start pt-1">
                    <div className="flex-1">
                      <textarea
                        value={newComment[post.id] ?? ""}
                        onChange={e => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Сэтгэгдэл бичих... (Ctrl+Enter)"
                        rows={2} className={TA}
                        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCreateComment(post.id) }}
                      />
                    </div>
                    <Button size="sm" className="mt-0.5 shrink-0"
                      disabled={!(newComment[post.id] ?? "").trim()}
                      onClick={() => handleCreateComment(post.id)}>
                      <Send className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

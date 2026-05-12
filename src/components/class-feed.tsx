"use client"

import { useState, useEffect, useCallback } from "react"
import { Heart, Send, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type Post = {
  id: string
  content: string
  created_at: string
  likes_count: number
  user_id: string
  profiles: { username: string; full_name: string; avatar_url: string | null } | null
  liked: boolean
}

type Props = {
  classId: string
  isMember: boolean
  currentUserId: string | null
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

function relativeTime(dateStr: string) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const s = Math.floor(diff / 1000)
    if (s < 60)   return `${s} секундын өмнө`
    const m = Math.floor(s / 60)
    if (m < 60)   return `${m} минутын өмнө`
    const h = Math.floor(m / 60)
    if (h < 24)   return `${h} цагийн өмнө`
    const d = Math.floor(h / 24)
    if (d < 30)   return `${d} өдрийн өмнө`
    const mo = Math.floor(d / 30)
    if (mo < 12)  return `${mo} сарын өмнө`
    return `${Math.floor(mo / 12)} жилийн өмнө`
  } catch { return "" }
}

export function ClassFeed({ classId, isMember, currentUserId }: Props) {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage]       = useState(0)
  const [text, setText]       = useState("")
  const [posting, setPosting] = useState(false)
  const [liking, setLiking]   = useState<Record<string, boolean>>({})

  const PAGE_SIZE = 20

  const loadPosts = useCallback(async (pageNum: number, replace = false) => {
    const supabase = createClient()
    const from = pageNum * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    const { data, error } = await supabase
      .from("posts")
      .select(`id, content, created_at, likes_count, user_id, profiles(username, full_name, avatar_url)`)
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) { toast.error("Нийтлэлүүд ачааллахад алдаа гарлаа"); setLoading(false); return }

    // Check liked status
    let likedIds: string[] = []
    if (currentUserId && data && data.length > 0) {
      const ids = data.map((p: any) => p.id)
      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", ids)
      likedIds = (likes ?? []).map((l: any) => l.post_id)
    }

    const enriched: Post[] = (data ?? []).map((p: any) => ({
      ...p,
      profiles: Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles,
      liked: likedIds.includes(p.id),
    }))

    setPosts((prev) => replace ? enriched : [...prev, ...enriched])
    setHasMore((data ?? []).length === PAGE_SIZE)
    setLoading(false)
  }, [classId, currentUserId])

  useEffect(() => { loadPosts(0, true) }, [loadPosts])

  async function handlePost() {
    if (!text.trim() || !currentUserId) return
    setPosting(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("posts")
      .insert({ class_id: classId, user_id: currentUserId, content: text.trim() })
      .select(`id, content, created_at, likes_count, user_id, profiles(username, full_name, avatar_url)`)
      .single()

    if (error) { toast.error("Нийтлэхэд алдаа гарлаа"); setPosting(false); return }
    const p = data as any
    const newPost: Post = {
      ...p,
      profiles: Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles,
      liked: false,
    }
    setPosts((prev) => [newPost, ...prev])
    setText("")
    setPosting(false)
  }

  async function toggleLike(post: Post) {
    if (!currentUserId || liking[post.id]) return
    setLiking((prev) => ({ ...prev, [post.id]: true }))
    const supabase = createClient()

    if (post.liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId)
      await supabase.from("posts").update({ likes_count: Math.max(0, post.likes_count - 1) }).eq("id", post.id)
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, liked: false, likes_count: p.likes_count - 1 } : p))
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId })
      await supabase.from("posts").update({ likes_count: post.likes_count + 1 }).eq("id", post.id)
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, liked: true, likes_count: p.likes_count + 1 } : p))
    }

    setLiking((prev) => ({ ...prev, [post.id]: false }))
  }

  return (
    <div className="space-y-4">
      {/* Post composer */}
      {isMember && currentUserId && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Нийтлэл бичих..."
            rows={3}
            className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handlePost} disabled={posting || !text.trim()}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span className="ml-1.5">Нийтлэх</span>
            </Button>
          </div>
        </div>
      )}

      {/* Posts list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Одоогоор нийтлэл байхгүй байна
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const name = post.profiles?.full_name ?? post.profiles?.username ?? "Хэрэглэгч"
            const uname = post.profiles?.username ?? ""
            return (
              <div key={post.id} className="rounded-2xl border bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold">
                      {initials(name) || "?"}
                    </AvatarFallback>
                    {post.profiles?.avatar_url && (
                      <img src={post.profiles.avatar_url} alt={name} className="size-full rounded-full object-cover" />
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">{name}</span>
                      {uname && <span className="text-xs text-muted-foreground">@{uname}</span>}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {relativeTime(post.created_at)}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 pl-12">
                  <button
                    onClick={() => toggleLike(post)}
                    disabled={!currentUserId || liking[post.id]}
                    className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 transition-colors ${
                      post.liked
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Heart className={`size-3.5 ${post.liked ? "fill-current" : ""}`} />
                    {post.likes_count}
                  </button>
                </div>
              </div>
            )
          })}

          {hasMore && (
            <div className="text-center pt-2">
              <Button variant="outline" size="sm" onClick={() => { const next = page + 1; setPage(next); loadPosts(next) }}>
                Цааш үзэх
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

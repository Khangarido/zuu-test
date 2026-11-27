"use client"

import { useState, useMemo, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Lock, Users, Globe, Search } from "lucide-react"
import { formatMNT, describeAccess } from "@/lib/class-format"

type ClassCard = {
  id: string
  slug: string
  name: string
  description: string | null
  cover_url: string | null
  member_count: number
  is_private: boolean
  price: number
  access_mode: string
  access_end_date: string | null
  access_days: number | null
  teacher: { full_name: string | null; username: string | null; avatar_url: string | null } | null
}

type Props = {
  classes: ClassCard[]
  memberClassIds: string[]
}

const COVER_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-violet-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
]
function gradientForSlug(slug: string) {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) & 0xffffff
  return COVER_GRADIENTS[Math.abs(h) % COVER_GRADIENTS.length]
}
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

export function ClassesClient({ classes, memberClassIds }: Props) {
  const router = useRouter()
  const [joined, setJoined] = useState<Set<string>>(new Set(memberClassIds))
  const [joining, setJoining] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return classes
    return classes.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.teacher?.full_name ?? "").toLowerCase().includes(q))
  }, [classes, query])

  async function handleJoinFree(classId: string) {
    if (joined.has(classId) || joining.has(classId)) return
    setJoining((prev) => new Set([...prev, classId]))
    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error === "PAYMENT_REQUIRED" ? "Энэ анги төлбөртэй" : (data.error ?? "Нэгдэхэд алдаа гарлаа"))
      } else {
        setJoined((prev) => new Set([...prev, classId]))
        toast.success("Ангид нэгдлээ")
        router.refresh()
      }
    } finally {
      setJoining((prev) => { const s = new Set(prev); s.delete(classId); return s })
    }
  }

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ангийн нэрээр хайх..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Globe className="size-10 opacity-30" />
          <p className="text-sm">{query ? "Хайлтад тохирох анги олдсонгүй" : "Анги байхгүй байна"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cls) => {
            const grad = gradientForSlug(cls.slug)
            const isMember = joined.has(cls.id)
            const isJoining = joining.has(cls.id)
            const teacherName = cls.teacher?.full_name ?? "Багш"
            const paid = cls.price > 0
            const locked = (cls.is_private || paid) && !isMember

            return (
              <div key={cls.id} className="group rounded-2xl border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all flex flex-col">
                <Link href={`/classes/${cls.slug}`}>
                  <div className={`h-28 bg-gradient-to-br ${grad} relative overflow-hidden`}>
                    {cls.cover_url && (
                      <img src={cls.cover_url} alt={cls.name} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow">{cls.name}</h3>
                    </div>
                    {cls.is_private && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white">
                        <Lock className="size-3" />Хувийн
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  {cls.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{cls.description}</p>
                  )}
                  {paid && (
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                      {formatMNT(cls.price)} · {describeAccess(cls)}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6 shrink-0">
                        <AvatarImage src={cls.teacher?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[10px] font-bold">
                          {initials(teacherName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">{teacherName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3" />{cls.member_count}
                      </span>
                      {isMember ? (
                        <Badge variant="secondary" className="text-xs">Нэгдсэн</Badge>
                      ) : locked ? (
                        <Link
                          href={`/classes/${cls.slug}`}
                          className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                        >
                          {paid ? "Төлөх" : "Дэлгэрэнгүй"}
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleJoinFree(cls.id)}
                          disabled={isJoining}
                          className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          {isJoining ? "..." : "Нэгдэх"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

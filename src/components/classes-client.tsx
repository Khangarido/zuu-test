"use client"

import { useState, useMemo, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock, Users, Globe, Loader2 } from "lucide-react"

type ClassCard = {
  id: string
  slug: string
  name: string
  description: string | null
  cover_url: string | null
  member_count: number
  is_private: boolean
  teacher: { full_name: string | null; username: string | null; avatar_url: string | null } | null
}

type Props = {
  publicClasses: ClassCard[]
  privateClasses: ClassCard[]
  memberClassIds: string[]
  userId: string
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

export function ClassesClient({ publicClasses, privateClasses, memberClassIds, userId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [joined, setJoined] = useState<Set<string>>(new Set(memberClassIds))
  const [joining, setJoining] = useState<Set<string>>(new Set())
  const [inviteCode, setInviteCode] = useState("")
  const [joiningCode, setJoiningCode] = useState(false)

  async function handleJoinByCode() {
    const code = inviteCode.trim().toUpperCase()
    if (!/^[A-Z]{5}$/.test(code)) {
      toast.error("5 үсгийн том үсгийн код оруулна уу")
      return
    }
    setJoiningCode(true)
    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Алдаа гарлаа")
      } else {
        toast.success(`Амжилттай нэгдлээ: ${data.name}`)
        router.push(`/classes/${data.slug}`)
      }
    } catch {
      toast.error("Сүлжээний алдаа гарлаа")
    } finally {
      setJoiningCode(false)
    }
  }

  async function handleJoin(classId: string) {
    if (joined.has(classId) || joining.has(classId)) return
    setJoining(prev => new Set([...prev, classId]))
    const { error } = await supabase.from("class_members").insert({
      class_id: classId,
      user_id: userId,
      role: "student",
    })
    setJoining(prev => { const s = new Set(prev); s.delete(classId); return s })
    if (error) {
      toast.error("Нэгдэхэд алдаа гарлаа")
    } else {
      setJoined(prev => new Set([...prev, classId]))
      toast.success("Ангид нэгдлээ")
    }
  }

  function ClassGrid({ classes, showJoin }: { classes: ClassCard[]; showJoin: boolean }) {
    if (classes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          {showJoin
            ? <><Globe className="size-10 opacity-30" /><p className="text-sm">Нийтийн анги байхгүй байна</p></>
            : <><Lock className="size-10 opacity-30" /><p className="text-sm font-medium">Хувийн анги байхгүй</p><p className="text-xs">Урилга хүлээгдэж байна</p></>
          }
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => {
          const grad = gradientForSlug(cls.slug)
          const isMember = joined.has(cls.id)
          const isJoining = joining.has(cls.id)
          const teacherName = cls.teacher?.full_name ?? "Багш"

          return (
            <div key={cls.id} className="group rounded-2xl border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all flex flex-col">
              {/* Cover */}
              <Link href={`/classes/${cls.slug}`}>
                <div className={`h-28 bg-gradient-to-br ${grad} relative overflow-hidden`}>
                  {cls.cover_url && (
                    <img src={cls.cover_url} alt={cls.name} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow">
                      {cls.name}
                    </h3>
                  </div>
                  {cls.is_private && (
                    <div className="absolute top-2 right-2">
                      <Lock className="size-3.5 text-white/80" />
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4 space-y-3 flex-1 flex flex-col">
                {cls.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{cls.description}</p>
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
                    {showJoin && (
                      isMember ? (
                        <Badge variant="secondary" className="text-xs">Нэгдсэн</Badge>
                      ) : (
                        <button
                          onClick={() => handleJoin(cls.id)}
                          disabled={isJoining}
                          className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          {isJoining ? "..." : "Нэгдэх"}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Tabs defaultValue="public">
      <TabsList className="mb-4">
        <TabsTrigger value="public" className="gap-1.5">
          <Globe className="size-3.5" />Нийтийн
          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground size-4 text-[10px] font-bold">
            {publicClasses.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="private" className="gap-1.5">
          <Lock className="size-3.5" />Хувийн
          {privateClasses.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground size-4 text-[10px] font-bold">
              {privateClasses.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="public">
        <ClassGrid classes={publicClasses} showJoin={true} />
      </TabsContent>

      <TabsContent value="private" className="space-y-5">
        {/* Invite code search */}
        <div className="flex gap-2">
          <Input
            placeholder="5 үсгийн кодоор хайх..."
            maxLength={5}
            value={inviteCode}
            onChange={(e) => {
              const val = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase()
              setInviteCode(val)
            }}
            onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
            className="max-w-xs font-mono tracking-widest uppercase"
          />
          <Button
            onClick={handleJoinByCode}
            disabled={joiningCode || inviteCode.length !== 5}
          >
            {joiningCode ? <Loader2 className="size-4 animate-spin" /> : "Нэгдэх"}
          </Button>
        </div>

        <ClassGrid classes={privateClasses} showJoin={false} />
      </TabsContent>
    </Tabs>
  )
}

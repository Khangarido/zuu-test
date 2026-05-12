import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Plus, BookOpen } from "lucide-react"

export const dynamic = "force-dynamic"

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

export default async function ClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, username, avatar_url, is_teacher")
    .eq("id", user.id)
    .maybeSingle()

  const admin = getSupabaseAdmin()
  const { data: classes } = await admin
    .from("classes")
    .select("id, slug, name, description, cover_url, member_count, created_at, teacher_id, profiles!teacher_id(full_name, username, avatar_url)")
    .eq("is_public", true)
    .order("member_count", { ascending: false })
    .limit(50)

  const isTeacher = !!(profile?.is_teacher)
  const fullName  = (profile?.full_name as string | null) ?? ""
  const role      = profile?.role === "admin" || profile?.role === "superadmin" ? "admin" : "student"

  return (
    <AppShell
      fullName={fullName}
      email={user.email ?? ""}
      role={role as "student" | "admin"}
      isAdmin={role === "admin"}
      username={(profile?.username as string | null) ?? null}
      avatarUrl={(profile?.avatar_url as string | null) ?? null}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Ангиуд</h1>
            <p className="text-muted-foreground mt-1">Нийгэмлэгийн сургалтын ангиуд</p>
          </div>
          {isTeacher && (
            <Button asChild className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              <Link href="/classes/new">
                <Plus className="size-4 mr-1.5" />
                Анги үүсгэх
              </Link>
            </Button>
          )}
        </div>

        {/* Grid */}
        {!classes || classes.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="size-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Одоогоор анги байхгүй байна</p>
            {isTeacher && (
              <Button asChild className="mt-4" variant="outline">
                <Link href="/classes/new">Эхний ангийг үүсгэх</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(classes ?? []).map((cls: any) => {
              const teacher = Array.isArray(cls.profiles) ? cls.profiles[0] : cls.profiles
              const teacherName = (teacher?.full_name as string) ?? "Багш"
              const grad = gradientForSlug(cls.slug)
              return (
                <Link key={cls.id} href={`/classes/${cls.slug}`}
                  className="group rounded-2xl border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all">
                  {/* Cover */}
                  <div className={`h-28 bg-gradient-to-br ${grad} relative overflow-hidden`}>
                    {cls.cover_url && (
                      <img src={cls.cover_url} alt={cls.name} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-3 left-4">
                      <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow">
                        {cls.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {cls.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{cls.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={teacher?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[10px] font-bold">
                            {initials(teacherName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{teacherName}</span>
                        <Badge className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-0">
                          Багш
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3" />
                        {cls.member_count ?? 0}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

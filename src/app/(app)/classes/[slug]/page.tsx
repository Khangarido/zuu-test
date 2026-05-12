import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProfileCard } from "@/components/profile-card"
import { ClassFeed } from "@/components/class-feed"
import { Users, BookOpen, MessageSquare, Clock, Plus } from "lucide-react"
import { JoinLeaveButton } from "./_join-leave-button"

export const dynamic = "force-dynamic"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

export default async function ClassDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: viewer } = await supabase
    .from("profiles")
    .select("full_name, role, username, avatar_url, is_teacher")
    .eq("id", user.id)
    .maybeSingle()

  const admin = getSupabaseAdmin()

  const { data: cls } = await admin
    .from("classes")
    .select("id, slug, name, description, cover_url, member_count, teacher_id, created_at, profiles!teacher_id(full_name, username, avatar_url)")
    .eq("slug", slug)
    .maybeSingle()

  if (!cls) notFound()

  const teacher = Array.isArray((cls as any).profiles) ? (cls as any).profiles[0] : (cls as any).profiles
  const isTeacher = user.id === cls.teacher_id
  const isAdminRole = viewer?.role === "admin" || viewer?.role === "superadmin"

  // Check membership
  const { data: memberRow } = await admin
    .from("class_members")
    .select("role")
    .eq("class_id", cls.id)
    .eq("user_id", user.id)
    .maybeSingle()

  const isMember = !!memberRow

  // Members
  const { data: members } = await admin
    .from("class_members")
    .select("user_id, role, joined_at, profiles!user_id(username, full_name, avatar_url, bio, is_teacher)")
    .eq("class_id", cls.id)
    .order("joined_at", { ascending: true })

  // Exam sets
  const { data: examSets } = await admin
    .from("class_exam_sets")
    .select("exam_set_id, added_at, exam_sets!exam_set_id(id, title, description, duration_minutes)")
    .eq("class_id", cls.id)
    .order("added_at", { ascending: false })

  const fullName  = (viewer?.full_name as string | null) ?? ""
  const role      = isAdminRole ? "admin" : "student"

  return (
    <AppShell
      fullName={fullName}
      email={user.email ?? ""}
      role={role as "student" | "admin"}
      isAdmin={isAdminRole}
      username={(viewer?.username as string | null) ?? null}
      avatarUrl={(viewer?.avatar_url as string | null) ?? null}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cover + header */}
        <div className="rounded-2xl overflow-hidden border">
          <div className="h-40 bg-gradient-to-br from-indigo-600 to-violet-700 relative">
            {cls.cover_url && (
              <img src={cls.cover_url} alt={cls.name} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="bg-card px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
              <div>
                <h1 className="text-2xl font-bold">{cls.name}</h1>
                {cls.description && (
                  <p className="text-muted-foreground text-sm mt-1">{cls.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="size-5">
                      <AvatarImage src={teacher?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[9px]">
                        {initials(teacher?.full_name ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <span>{teacher?.full_name ?? "Багш"}</span>
                    <Badge className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-0">Багш</Badge>
                  </div>
                  <span className="flex items-center gap-1"><Users className="size-3" />{cls.member_count ?? 0} гишүүн</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {(isTeacher || isAdminRole) && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/classes/${slug}/add-exam`}>
                      <Plus className="size-4 mr-1" />Шалгалт нэмэх
                    </Link>
                  </Button>
                )}
                {!isTeacher && (
                  <JoinLeaveButton classId={cls.id} isMember={isMember} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="feed">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="feed" className="gap-1.5">
              <MessageSquare className="size-3.5" />Нийтлэл
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="size-3.5" />Гишүүд
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-1.5">
              <BookOpen className="size-3.5" />Шалгалт
            </TabsTrigger>
          </TabsList>

          {/* Feed */}
          <TabsContent value="feed" className="mt-4">
            <ClassFeed classId={cls.id} isMember={isMember} currentUserId={user.id} />
          </TabsContent>

          {/* Members */}
          <TabsContent value="members" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(members ?? []).map((m: any) => {
                const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
                if (!p?.username) return null
                return (
                  <ProfileCard
                    key={m.user_id}
                    username={p.username}
                    displayName={p.full_name ?? p.username}
                    bio={p.bio ?? null}
                    avatarUrl={p.avatar_url ?? null}
                    isTeacher={m.role === "teacher" || !!p.is_teacher}
                  />
                )
              })}
            </div>
          </TabsContent>

          {/* Exams */}
          <TabsContent value="exams" className="mt-4">
            {!examSets || examSets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <BookOpen className="size-8 mx-auto mb-2 opacity-30" />
                Шалгалт нэмэгдээгүй байна
              </div>
            ) : (
              <div className="space-y-3">
                {(examSets ?? []).map((es: any) => {
                  const e = Array.isArray(es.exam_sets) ? es.exam_sets[0] : es.exam_sets
                  if (!e) return null
                  return (
                    <Card key={es.exam_set_id}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{e.title}</p>
                            {e.description && (
                              <p className="text-sm text-muted-foreground truncate mt-0.5">{e.description}</p>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="size-3" />{e.duration_minutes} минут
                            </div>
                          </div>
                          <Button size="sm" asChild variant="outline">
                            <Link href={`/exam/${e.id}`}>Шалгалт өгөх</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}

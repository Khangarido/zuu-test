import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AppShell } from "@/components/app-shell"
import { ClassDetailClient } from "@/components/class-detail-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Lock, Users } from "lucide-react"

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
    .select("id, slug, name, description, cover_url, member_count, is_private, teacher_id, profiles!teacher_id(full_name, username, avatar_url)")
    .eq("slug", slug)
    .maybeSingle()

  if (!cls) notFound()

  // Determine membership and roles
  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", cls.id)
    .eq("user_id", user.id)
    .maybeSingle()

  const memberRole = membership?.role ?? null
  const isAdminRole = viewer?.role === "admin" || viewer?.role === "superadmin"
  const isTeacher = memberRole === "teacher" || isAdminRole
  const isMember = memberRole !== null || isAdminRole

  const fullName = (viewer?.full_name as string | null) ?? ""
  const role = isAdminRole ? "admin" : "student"

  // Gate: private class + not a member
  if ((cls as any).is_private && !isMember) {
    return (
      <AppShell
        fullName={fullName}
        email={user.email ?? ""}
        role={role as "student" | "admin"}
        isAdmin={isAdminRole}
        username={(viewer?.username as string | null) ?? null}
        avatarUrl={(viewer?.avatar_url as string | null) ?? null}
        userId={user.id}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-sm text-center">
            <CardContent className="pt-10 pb-10 space-y-3">
              <div className="flex items-center justify-center mx-auto size-14 rounded-full bg-muted">
                <Lock className="size-7 text-muted-foreground" />
              </div>
              <p className="font-semibold text-base">Энэ анги хувийн байна</p>
              <p className="text-sm text-muted-foreground">Багшаас урилга хүлээнэ үү.</p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  // Fetch posts
  const { data: rawPosts } = await admin
    .from("class_posts")
    .select("id, title, body, photo_url, created_at, author_id, profiles!author_id(full_name, username, avatar_url)")
    .eq("class_id", cls.id)
    .order("created_at", { ascending: false })

  const postIds = (rawPosts ?? []).map((p: any) => p.id as string)

  // Reaction counts per post
  const { data: rawReactions } = postIds.length
    ? await admin.from("class_post_reactions").select("post_id").in("post_id", postIds)
    : { data: [] }
  const reactionCounts: Record<string, number> = {}
  for (const r of rawReactions ?? []) {
    reactionCounts[r.post_id] = (reactionCounts[r.post_id] ?? 0) + 1
  }

  // Current user's reactions
  const { data: myRxnRows } = postIds.length
    ? await supabase.from("class_post_reactions").select("post_id").eq("user_id", user.id).in("post_id", postIds)
    : { data: [] }
  const myReactionPostIds = (myRxnRows ?? []).map((r: any) => r.post_id as string)

  // Exams
  const { data: rawExams } = await admin
    .from("class_exams")
    .select("id, exam_set_id, exam_sets(id, title, duration_minutes)")
    .eq("class_id", cls.id)

  // Members (only if teacher)
  const { data: rawMembers } = isTeacher
    ? await admin
        .from("class_members")
        .select("user_id, role, profiles!user_id(full_name, username, avatar_url, rank_tier)")
        .eq("class_id", cls.id)
    : { data: [] }

  // Normalise data
  const initialPosts = (rawPosts ?? []).map((p: any) => ({
    id: p.id as string,
    title: p.title as string,
    body: p.body as string,
    photo_url: (p.photo_url as string | null) ?? null,
    created_at: p.created_at as string,
    author_id: p.author_id as string,
    reaction_count: 0,
    reacted: myReactionPostIds.includes(p.id as string),
    profiles: (() => {
      const pr = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
      return pr ? { full_name: pr.full_name ?? null, username: pr.username ?? null, avatar_url: pr.avatar_url ?? null } : null
    })(),
  }))

  const initialExams = (rawExams ?? []).map((e: any) => {
    const es = Array.isArray(e.exam_sets) ? e.exam_sets[0] : e.exam_sets
    return {
      id: e.id as string,
      exam_set_id: e.exam_set_id as string,
      title: (es?.title as string) ?? "Шалгалт",
      duration_minutes: (es?.duration_minutes as number) ?? 0,
    }
  })

  const initialMembers = (rawMembers ?? []).map((m: any) => {
    const pr = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      user_id: m.user_id as string,
      role: m.role as string,
      full_name: (pr?.full_name as string | null) ?? null,
      username: (pr?.username as string | null) ?? null,
      avatar_url: (pr?.avatar_url as string | null) ?? null,
      rank_tier: (pr?.rank_tier as string | null) ?? null,
    }
  })

  const teacher = Array.isArray((cls as any).profiles) ? (cls as any).profiles[0] : (cls as any).profiles

  return (
    <AppShell
      fullName={fullName}
      email={user.email ?? ""}
      role={role as "student" | "admin"}
      isAdmin={isAdminRole}
      username={(viewer?.username as string | null) ?? null}
      avatarUrl={(viewer?.avatar_url as string | null) ?? null}
      userId={user.id}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Cover header */}
        <div className="rounded-2xl overflow-hidden border">
          <div className="h-40 bg-gradient-to-br from-indigo-600 to-violet-700 relative">
            {cls.cover_url && (
              <img src={cls.cover_url} alt={cls.name} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/30" />
            {(cls as any).is_private && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 text-white text-xs rounded-full px-2.5 py-1">
                <Lock className="size-3" />Хувийн
              </div>
            )}
          </div>
          <div className="bg-card px-6 py-5">
            <h1 className="text-2xl font-bold">{cls.name}</h1>
            {cls.description && (
              <p className="text-muted-foreground text-sm mt-1">{cls.description as string}</p>
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
                <Badge className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-0">
                  Багш
                </Badge>
              </div>
              <span className="flex items-center gap-1"><Users className="size-3" />{(cls as any).member_count ?? 0} гишүүн</span>
            </div>
          </div>
        </div>

        {/* Interactive content */}
        <ClassDetailClient
          cls={{
            id: cls.id,
            name: cls.name,
            slug: cls.slug,
            is_private: !!(cls as any).is_private,
          }}
          currentUserId={user.id}
          isTeacher={isTeacher}
          isAdmin={isAdminRole}
          isMember={isMember}
          initialPosts={initialPosts}
          initialExams={initialExams}
          initialMembers={initialMembers}
          myReactionPostIds={myReactionPostIds}
          reactionCounts={reactionCounts}
        />
      </div>
    </AppShell>
  )
}

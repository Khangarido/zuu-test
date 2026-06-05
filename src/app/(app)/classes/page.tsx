import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AppShell } from "@/components/app-shell"
import { ClassesClient } from "@/components/classes-client"
import { BookOpen } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const admin = getSupabaseAdmin()

  // User's memberships (to know which public classes they joined + get private class IDs)
  const { data: myMemberships } = await supabase
    .from("class_members")
    .select("class_id, role")
    .eq("user_id", user.id)

  const memberClassIds = (myMemberships ?? []).map((m) => m.class_id as string)
  const privateClassIds = memberClassIds.filter(Boolean)

  // Public classes
  const { data: publicRaw } = await admin
    .from("classes")
    .select("id, slug, name, description, cover_url, member_count, is_private, teacher_id, profiles!teacher_id(full_name, username, avatar_url)")
    .eq("is_private", false)
    .order("member_count", { ascending: false })
    .limit(60)

  // Private classes where user is a member
  let privateRaw: any[] = []
  if (privateClassIds.length > 0) {
    const { data } = await admin
      .from("classes")
      .select("id, slug, name, description, cover_url, member_count, is_private, teacher_id, profiles!teacher_id(full_name, username, avatar_url)")
      .eq("is_private", true)
      .in("id", privateClassIds)
    privateRaw = data ?? []
  }

  function normalise(raw: any[]) {
    return (raw ?? []).map((cls: any) => ({
      id: cls.id as string,
      slug: cls.slug as string,
      name: cls.name as string,
      description: (cls.description as string | null) ?? null,
      cover_url: (cls.cover_url as string | null) ?? null,
      member_count: (cls.member_count as number) ?? 0,
      is_private: !!(cls.is_private),
      teacher: (() => {
        const t = Array.isArray(cls.profiles) ? cls.profiles[0] : cls.profiles
        return t ? {
          full_name: (t.full_name as string | null) ?? null,
          username: (t.username as string | null) ?? null,
          avatar_url: (t.avatar_url as string | null) ?? null,
        } : null
      })(),
    }))
  }

  const publicClasses = normalise(publicRaw ?? [])
  const privateClasses = normalise(privateRaw)

  const role = profile?.role === "admin" || profile?.role === "superadmin" ? "admin" : "student"

  return (
    <AppShell
      fullName={(profile?.full_name as string | null) ?? ""}
      email={user.email ?? ""}
      role={role as "student" | "admin"}
      isAdmin={role === "admin"}
      username={(profile?.username as string | null) ?? null}
      avatarUrl={(profile?.avatar_url as string | null) ?? null}
      userId={user.id}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
            <BookOpen className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Ангиуд</h1>
            <p className="text-sm text-muted-foreground">Сургалтын ангиуд</p>
          </div>
        </div>

        <ClassesClient
          publicClasses={publicClasses}
          privateClasses={privateClasses}
          memberClassIds={memberClassIds}
          userId={user.id}
        />
      </div>
    </AppShell>
  )
}

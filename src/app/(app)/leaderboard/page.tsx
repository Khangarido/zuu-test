import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AppShell } from "@/components/app-shell"
import { LeaderboardClient } from "./_client"
import type { ExpStudent } from "./_client"
import { Trophy } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: viewer } = await supabase
    .from("profiles")
    .select("full_name, role, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const admin = getSupabaseAdmin()

  // Top 100 students by rank_score
  const { data: rows } = await admin
    .from("profiles")
    .select("id, full_name, username, avatar_url, grade, subjects, rank_score, rank_tier")
    .eq("role", "student")
    .order("rank_score", { ascending: false })
    .limit(100)

  // Attempt counts per user
  const userIds = (rows ?? []).map((r) => r.id)
  const { data: attemptCounts } = await admin
    .from("attempts")
    .select("user_id")
    .in("user_id", userIds)
    .eq("status", "submitted")

  const countMap: Record<string, number> = {}
  for (const a of attemptCounts ?? []) {
    countMap[a.user_id] = (countMap[a.user_id] ?? 0) + 1
  }

  const students = (rows ?? []).map((r) => ({
    id: r.id,
    full_name:  r.full_name  as string | null,
    username:   r.username   as string | null,
    avatar_url: r.avatar_url as string | null,
    grade:      r.grade      as string | null,
    subjects:   r.subjects   as string[] | null,
    rank_score: (r.rank_score as number) ?? 0,
    rank_tier:  (r.rank_tier  as string) ?? "Bronze",
    attempts:   countMap[r.id] ?? 0,
  }))

  // EXP leaderboard — top 50 by exp_points
  const { data: expRows } = await admin
    .from("profiles")
    .select("id, full_name, username, avatar_url, exp_points")
    .eq("role", "student")
    .order("exp_points", { ascending: false })
    .limit(50)

  const expStudents: ExpStudent[] = (expRows ?? []).map((r) => ({
    id: r.id as string,
    full_name: r.full_name as string | null,
    username: r.username as string | null,
    avatar_url: r.avatar_url as string | null,
    exp_points: (r.exp_points as number) ?? 0,
  }))

  const viewerRole =
    viewer?.role === "admin" || viewer?.role === "superadmin" ? "admin" : "student"

  return (
    <AppShell
      fullName={viewer?.full_name ?? ""}
      email={user.email ?? ""}
      role={viewerRole as "student" | "admin"}
      isAdmin={viewerRole === "admin"}
      username={viewer?.username ?? null}
      avatarUrl={viewer?.avatar_url ?? null}
      userId={user.id}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-sm">
            <Trophy className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Эрэмбэ</h1>
            <p className="text-sm text-muted-foreground">
              Шилдэг 100 сурагч
            </p>
          </div>
        </div>

        <LeaderboardClient students={students} expStudents={expStudents} currentUserId={user.id} />
      </div>
    </AppShell>
  )
}

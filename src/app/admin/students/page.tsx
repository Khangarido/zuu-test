import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { StudentsClient } from "./_client"

export const dynamic = "force-dynamic"

export default async function StudentsAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: viewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (!viewer || viewer.role !== "superadmin") {
    redirect("/admin")
  }

  const admin = getSupabaseAdmin()

  const { data: students } = await admin
    .from("profiles")
    .select(
      "id, full_name, username, avatar_url, grade, subjects, rank_score, rank_tier, created_at"
    )
    .eq("role", "student")
    .order("rank_score", { ascending: false })

  // Get attempt stats
  const userIds = (students ?? []).map((s) => s.id)
  const { data: attempts } = await admin
    .from("attempts")
    .select("user_id, score_percentage")
    .in("user_id", userIds)
    .eq("status", "submitted")

  const statsMap: Record<string, { count: number; total: number }> = {}
  for (const a of attempts ?? []) {
    if (!statsMap[a.user_id]) statsMap[a.user_id] = { count: 0, total: 0 }
    statsMap[a.user_id].count++
    statsMap[a.user_id].total += a.score_percentage ?? 0
  }

  const enriched = (students ?? []).map((s) => ({
    id:         s.id,
    full_name:  s.full_name  as string | null,
    username:   s.username   as string | null,
    avatar_url: s.avatar_url as string | null,
    grade:      s.grade      as string | null,
    subjects:   s.subjects   as string[] | null,
    rank_score: (s.rank_score as number) ?? 0,
    rank_tier:  (s.rank_tier  as string) ?? "Bronze",
    created_at: s.created_at as string,
    attempts:   statsMap[s.id]?.count ?? 0,
    avg_score:  statsMap[s.id]?.count
      ? statsMap[s.id].total / statsMap[s.id].count
      : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Сурагчид</h1>
        <p className="text-muted-foreground">
          Бүртгэлтэй сурагчдын дэлгэрэнгүй жагсаалт — {enriched.length} сурагч
        </p>
      </div>

      <StudentsClient students={enriched} />
    </div>
  )
}

import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CommunityFeed } from "@/components/community-client"
import { Trophy } from "lucide-react"

export const dynamic = "force-dynamic"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, username, avatar_url")
    .eq("id", user.id).maybeSingle()

  const admin = getSupabaseAdmin()

  // Top 10 leaderboard this month
  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const { data: topAttempts } = await admin
    .from("attempts")
    .select("user_id, score_percentage")
    .eq("status", "submitted")
    .gte("submitted_at", monthStart.toISOString())

  const userScores: Record<string, { total: number; count: number }> = {}
  for (const a of topAttempts ?? []) {
    if (!a.user_id) continue
    if (!userScores[a.user_id]) userScores[a.user_id] = { total: 0, count: 0 }
    userScores[a.user_id].total += a.score_percentage ?? 0
    userScores[a.user_id].count++
  }
  const topUserIds = Object.entries(userScores)
    .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))
    .slice(0, 10).map(([uid]) => uid)

  let leaderboard: any[] = []
  if (topUserIds.length > 0) {
    const { data: lbProfiles } = await admin
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", topUserIds)
    leaderboard = (lbProfiles ?? []).map((p: any) => ({
      ...p,
      avgScore: userScores[p.id] ? Math.round(userScores[p.id].total / userScores[p.id].count) : 0,
      attempts: userScores[p.id]?.count ?? 0,
    })).sort((a: any, b: any) => b.avgScore - a.avgScore)
  }

  const role = profile?.role === "admin" || profile?.role === "superadmin" ? "admin" : "student"
  const isAdmin = role === "admin"

  return (
    <AppShell
      fullName={(profile?.full_name as string | null) ?? ""}
      email={user.email ?? ""}
      role={role as "student" | "admin"}
      isAdmin={isAdmin}
      username={(profile?.username as string | null) ?? null}
      avatarUrl={(profile?.avatar_url as string | null) ?? null}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">Нийгэмлэг</h1>
          <p className="text-muted-foreground mt-1 text-sm">Нийтлэл бичих, сэтгэгдэл үлдээх</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed — client component handles all CRUD */}
          <div className="lg:col-span-2">
            <CommunityFeed currentUserId={user.id} isAdmin={isAdmin} />
          </div>

          {/* Leaderboard sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="size-4 text-amber-500" />
                  Энэ сарын шилдэг
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-4">
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Мэдээлэл байхгүй</p>
                ) : leaderboard.map((u, i) => (
                  <Link key={u.id} href={`/profile/${u.username ?? ""}`}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent transition-colors">
                    <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-amber-100 text-amber-700" :
                      i === 1 ? "bg-slate-100 text-slate-600" :
                      i === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{i + 1}</div>
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage src={u.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[10px] font-bold">
                        {initials(u.full_name ?? u.username ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{u.full_name ?? u.username}</p>
                      <p className="text-[10px] text-muted-foreground">{u.attempts} шалгалт</p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{u.avgScore}%</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

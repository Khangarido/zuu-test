import { redirect } from "next/navigation"
import Link from "next/link"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users, ClipboardList, TrendingUp, Activity,
  Wallet, BarChart3, Trophy,
} from "lucide-react"
import {
  ExamActivityChart, SubjectPopularity, QuickActionsPanel,
  RecentSignupsTable, TierBadge, RefreshButton,
} from "./_client"
import { promoteToAdmin } from "./_actions"

export const dynamic = "force-dynamic"

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmt(n: number) { return new Intl.NumberFormat("mn-MN").format(n) }
function scoreColor(s: number) {
  if (s >= 70) return "text-emerald-400"
  if (s >= 40) return "text-amber-400"
  return "text-red-400"
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} мин`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} цаг`
  return `${Math.floor(hrs / 24)} өдөр`
}
function gradeLabel(g: string | null) {
  if (!g) return "—"
  if (g === "graduated") return "Төгссөн"
  if (g === "other") return "Бусад"
  return `${g}-р анги`
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function SuperadminDashboardPage() {
  const supabase = getSupabaseAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: viewer } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (!viewer || viewer.role !== "superadmin") redirect("/admin")

  const admin = getSupabaseAdmin()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const day14Ago = new Date(Date.now() - 14 * 86_400_000)

  const [
    { count: totalStudents },
    { count: totalAttempts },
    { count: todayAttempts },
    { data: scores },
    { data: accessRaw },
    { data: examPrices },
    { data: recentSignups },
    { data: topRaw },
    { data: recentAttemptsRaw },
    { data: activityRaw },
    { data: subjectProfiles },
    { data: attemptStats },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    admin.from("attempts").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    admin.from("attempts").select("*", { count: "exact", head: true }).eq("status", "submitted").gte("submitted_at", todayStart.toISOString()),
    admin.from("attempts").select("score_percentage").eq("status", "submitted"),
    admin.from("access").select("exam_set_id"),
    admin.from("exam_sets").select("id, price"),
    admin.from("profiles").select("id, full_name, username, avatar_url, grade, subjects, rank_tier, created_at").eq("role", "student").order("created_at", { ascending: false }).limit(10),
    admin.from("profiles").select("id, full_name, username, avatar_url, grade, rank_score, rank_tier").eq("role", "student").order("rank_score", { ascending: false }).limit(10),
    admin.from("attempts").select("id, user_id, exam_set_id, score_percentage, submitted_at").eq("status", "submitted").order("submitted_at", { ascending: false }).limit(20),
    admin.from("attempts").select("submitted_at").eq("status", "submitted").gte("submitted_at", day14Ago.toISOString()),
    admin.from("profiles").select("subjects").eq("role", "student"),
    admin.from("attempts").select("user_id, score_percentage").eq("status", "submitted"),
  ])

  /* ── Computed stats ── */
  const avgScore = scores?.length
    ? (scores.reduce((s, a) => s + (a.score_percentage ?? 0), 0) / scores.length)
    : 0

  const priceMap = new Map((examPrices ?? []).map((e) => [e.id, e.price ?? 0]))
  const paidAccess = (accessRaw ?? []).filter((a) => (priceMap.get(a.exam_set_id) ?? 0) > 0).length
  const freeAccess = (accessRaw ?? []).length - paidAccess
  const estRevenue = paidAccess * 1000

  /* ── Activity chart data ── */
  const dayCount: Record<string, number> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    dayCount[d.toLocaleDateString("mn-MN", { month: "numeric", day: "numeric" })] = 0
  }
  for (const a of activityRaw ?? []) {
    const label = new Date(a.submitted_at).toLocaleDateString("mn-MN", { month: "numeric", day: "numeric" })
    if (dayCount[label] !== undefined) dayCount[label]++
  }
  const activityData = Object.entries(dayCount).map(([date, count]) => ({ date, count }))

  /* ── Subject popularity ── */
  const subjectCount: Record<string, number> = {}
  for (const p of subjectProfiles ?? []) {
    for (const s of (p.subjects as string[] | null) ?? []) {
      subjectCount[s] = (subjectCount[s] ?? 0) + 1
    }
  }
  const total = (totalStudents ?? 1)
  const subjectData = Object.entries(subjectCount)
    .sort((a, b) => b[1] - a[1])
    .map(([subject, count]) => ({ subject, count, pct: Math.round(count / total * 100) }))

  /* ── Top performers with attempt stats ── */
  const statsMap: Record<string, { count: number; total: number }> = {}
  for (const a of attemptStats ?? []) {
    if (!statsMap[a.user_id]) statsMap[a.user_id] = { count: 0, total: 0 }
    statsMap[a.user_id].count++
    statsMap[a.user_id].total += a.score_percentage ?? 0
  }
  const topPerformers = (topRaw ?? []).map((s, i) => ({
    rank: i + 1,
    id: s.id as string,
    full_name: s.full_name as string | null,
    username: s.username as string | null,
    avatar_url: s.avatar_url as string | null,
    grade: s.grade as string | null,
    rank_score: (s.rank_score as number) ?? 0,
    rank_tier: (s.rank_tier as string) ?? "Bronze",
    attempts: statsMap[s.id as string]?.count ?? 0,
    avg: statsMap[s.id as string]?.count
      ? statsMap[s.id as string].total / statsMap[s.id as string].count : null,
  }))

  /* ── Recent attempts with names + exam titles ── */
  const attemptUserIds = [...new Set((recentAttemptsRaw ?? []).map((a) => a.user_id))]
  const attemptExamIds = [...new Set((recentAttemptsRaw ?? []).map((a) => a.exam_set_id))]
  const [{ data: attemptProfiles }, { data: attemptExams }] = await Promise.all([
    admin.from("profiles").select("id, full_name, avatar_url").in("id", attemptUserIds),
    admin.from("exam_sets").select("id, title").in("id", attemptExamIds),
  ])
  const profileMap = new Map((attemptProfiles ?? []).map((p) => [p.id, p]))
  const examMap = new Map((attemptExams ?? []).map((e) => [e.id, e]))
  const recentAttempts = (recentAttemptsRaw ?? []).map((a) => ({
    id: a.id as string,
    score: a.score_percentage as number ?? 0,
    submitted_at: a.submitted_at as string,
    user: profileMap.get(a.user_id) ?? null,
    exam: examMap.get(a.exam_set_id) ?? null,
  }))

  /* ── Signups for table ── */
  const signups = (recentSignups ?? []).map((s) => ({
    id: s.id as string,
    full_name: s.full_name as string | null,
    username: s.username as string | null,
    avatar_url: s.avatar_url as string | null,
    grade: s.grade as string | null,
    subjects: s.subjects as string[] | null,
    rank_tier: (s.rank_tier as string) ?? "Bronze",
    created_at: s.created_at as string,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Superadmin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Зуу Академийн ерөнхий удирдлага</p>
        </div>
        <RefreshButton />
      </div>

      {/* 1. Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Нийт сурагч", value: fmt(totalStudents ?? 0), icon: Users, color: "text-indigo-400" },
          { label: "Нийт шалгалт өгсөн", value: fmt(totalAttempts ?? 0), icon: ClipboardList, color: "text-emerald-400" },
          { label: "Өнөөдөр өгсөн", value: fmt(todayAttempts ?? 0), icon: Activity, color: "text-amber-400" },
          { label: "Дундаж оноо", value: `${avgScore.toFixed(1)}%`, icon: TrendingUp, color: "text-violet-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`size-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. Revenue */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Орлого — тооцоолсон</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Нийт эрх олголт", value: fmt((accessRaw ?? []).length), color: "text-foreground" },
              { label: "Үнэгүй эрх", value: fmt(freeAccess), color: "text-muted-foreground" },
              { label: "Төлбөртэй эрх", value: fmt(paidAccess), color: "text-emerald-400" },
              { label: "Тооцоолсон орлого", value: `${fmt(estRevenue)}₮`, color: "text-yellow-400" },
            ].map((r) => (
              <div key={r.label} className="space-y-0.5">
                <div className={`text-xl font-bold ${r.color}`}>{r.value}</div>
                <div className="text-xs text-muted-foreground">{r.label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Тооцоолсон орлого (1 шалгалт = 1,000₮)</p>
        </CardContent>
      </Card>

      {/* 3. Recent signups */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Сүүлийн бүртгэгдсэн сурагчид</CardTitle></CardHeader>
        <CardContent>
          <RecentSignupsTable students={signups} onPromote={promoteToAdmin} />
        </CardContent>
      </Card>

      {/* 4. Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="size-4 text-yellow-400" /> Шилдэг 10 сурагч
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-3 font-medium w-8">#</th>
                  <th className="text-left py-2 pr-4 font-medium">Сурагч</th>
                  <th className="text-left py-2 pr-4 font-medium">Tier</th>
                  <th className="text-right py-2 pr-4 font-medium">Rank оноо</th>
                  <th className="text-right py-2 pr-4 font-medium">Оролдлого</th>
                  <th className="text-right py-2 font-medium">Дундаж</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 text-muted-foreground font-mono text-xs">{s.rank}</td>
                    <td className="py-2.5 pr-4">
                      <Link href={`/admin/students/${s.id}`} className="flex items-center gap-2 hover:underline">
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={s.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs bg-indigo-500/20 text-indigo-300">
                            {s.full_name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{s.full_name ?? "—"}</div>
                          {s.username && <div className="text-xs text-muted-foreground">@{s.username}</div>}
                        </div>
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4"><TierBadge tier={s.rank_tier} /></td>
                    <td className="py-2.5 pr-4 text-right font-mono text-indigo-400">{s.rank_score.toFixed(1)}</td>
                    <td className="py-2.5 pr-4 text-right text-muted-foreground">{s.attempts}</td>
                    <td className="py-2.5 text-right">
                      {s.avg != null ? <span className={scoreColor(s.avg)}>{s.avg.toFixed(1)}%</span> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topPerformers.length === 0 && <p className="text-sm text-muted-foreground py-4">Мэдээлэл байхгүй</p>}
          </div>
        </CardContent>
      </Card>

      {/* 5 + 6: Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="size-4 text-indigo-400" /> Сүүлийн 14 хоногийн идэвх</CardTitle></CardHeader>
          <CardContent><ExamActivityChart data={activityData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Хичээлийн сонирхол</CardTitle></CardHeader>
          <CardContent><SubjectPopularity data={subjectData} /></CardContent>
        </Card>
      </div>

      {/* 7 + 8: Quick actions + Recent attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Хурдан үйлдлүүд</CardTitle></CardHeader>
          <CardContent><QuickActionsPanel /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Сүүлийн 20 шалгалт</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {recentAttempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={(a.user as { avatar_url?: string | null } | null)?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-indigo-500/20 text-indigo-300">
                        {((a.user as { full_name?: string | null } | null)?.full_name ?? "?")?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">
                        {(a.user as { full_name?: string | null } | null)?.full_name ?? "Хэрэглэгч"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {(a.exam as { title?: string } | null)?.title ?? "Шалгалт"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-bold ${scoreColor(a.score)}`}>{a.score.toFixed(0)}%</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(a.submitted_at)}</span>
                  </div>
                </div>
              ))}
              {recentAttempts.length === 0 && <p className="text-sm text-muted-foreground">Шалгалт өгөөгүй байна</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

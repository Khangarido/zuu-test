import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getTierColor, getTierEmoji } from "@/lib/ranking"
import { Edit, MapPin, Globe, AtSign } from "lucide-react"
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap"
import { ScoreRadar } from "@/components/analytics/score-radar"
import { StatsRow } from "@/components/analytics/stats-row"

export const dynamic = "force-dynamic"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : score >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{score.toFixed(0)}%</span>
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: viewer } = await supabase.from("profiles")
    .select("full_name, role, username, avatar_url").eq("id", user.id).maybeSingle()

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from("profiles")
    .select("id, full_name, first_name, last_name, username, avatar_url, grade, subjects, rank_score, rank_tier, bio, location, website, twitter, is_teacher, display_name, joined_at")
    .eq("username", username).maybeSingle()
  if (!profile) notFound()

  const isOwnProfile = user.id === profile.id
  const { data: attempts } = await admin.from("attempts")
    .select("id, score_percentage, submitted_at, exam_set:exam_sets(title)")
    .eq("user_id", profile.id).eq("status", "submitted").order("submitted_at", { ascending: false })

  const submitted = attempts ?? []
  const avgScore = submitted.length ? submitted.reduce((s, a) => s + (a.score_percentage ?? 0), 0) / submitted.length : null
  const bestScore = submitted.length ? Math.max(...submitted.map((a) => a.score_percentage ?? 0)) : null

  const { count: rankAbove } = await admin.from("profiles")
    .select("id", { count: "exact", head: true }).gt("rank_score", profile.rank_score ?? 0).eq("role", "student")
  const rankPosition = (rankAbove ?? 0) + 1

  const uniqueDays = new Set(submitted.map((a) => {
    if (!a.submitted_at) return ""
    const d = new Date(a.submitted_at); d.setHours(0,0,0,0); return d.getTime()
  }).filter(Boolean))
  let streak = 0
  const cursor = new Date(); cursor.setHours(0,0,0,0)
  while (uniqueDays.has(cursor.getTime())) { streak++; cursor.setDate(cursor.getDate() - 1) }

  const SUBJECT_KEYWORDS = [
    { label: "Математик", keywords: ["математик"] },
    { label: "Монгол хэл", keywords: ["монгол"] },
    { label: "Англи хэл", keywords: ["англи"] },
    { label: "Физик", keywords: ["физик"] },
    { label: "Хими", keywords: ["хими"] },
    { label: "Биологи", keywords: ["биологи"] },
    { label: "Газарзүй", keywords: ["газарзүй"] },
    { label: "Түүх", keywords: ["түүх"] },
  ]
  const subjectScores: Record<string, number[]> = {}
  for (const a of submitted) {
    const title = ((a.exam_set as unknown as { title: string } | null)?.title ?? "").toLowerCase()
    for (const s of SUBJECT_KEYWORDS) {
      if (s.keywords.some((k) => title.includes(k)))
        subjectScores[s.label] = [...(subjectScores[s.label] ?? []), a.score_percentage ?? 0]
    }
  }
  const radarData = Object.entries(subjectScores)
    .map(([label, scores]) => ({ label, value: scores.reduce((a, b) => a + b, 0) / scores.length }))

  const viewerRole = viewer?.role === "admin" || viewer?.role === "superadmin" ? "admin" : "student"
  const displayName = (profile.display_name as string | null) ?? profile.full_name ?? `${profile.last_name ?? ""} ${profile.first_name ?? ""}`.trim()
  const tier = profile.rank_tier ?? "Bronze"
  const joinedAt = profile.joined_at ? new Date(profile.joined_at as string).toLocaleDateString("mn-MN", { year: "numeric", month: "long" }) : null

  return (
    <AppShell fullName={viewer?.full_name ?? ""} email={user.email ?? ""} role={viewerRole as "student" | "admin"} isAdmin={viewerRole === "admin"} username={viewer?.username ?? null} avatarUrl={viewer?.avatar_url ?? null}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <Avatar className="size-20 ring-4 ring-primary/10 shrink-0 self-center sm:self-start">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xl font-bold">{initials(displayName) || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">{displayName}</h1>
                  {profile.is_teacher && <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-0">Багш</Badge>}
                </div>
                <p className="text-muted-foreground text-sm">@{profile.username}</p>
                {profile.bio && <p className="mt-2 text-sm leading-relaxed text-foreground/80">{profile.bio as string}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                  {profile.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{profile.location as string}</span>}
                  {profile.website && <a href={profile.website as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors"><Globe className="size-3" />{(profile.website as string).replace(/^https?:\/\//, "")}</a>}
                  {profile.twitter && <a href={`https://twitter.com/${profile.twitter as string}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors"><AtSign className="size-3" />{profile.twitter as string}</a>}
                  {joinedAt && <span>{joinedAt}-аас нэгдсэн</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${getTierColor(tier)}`}>{getTierEmoji(tier)} {tier}</span>
                  {profile.grade && <Badge variant="secondary">{profile.grade === "graduated" ? "Төгссөн" : profile.grade === "other" ? "Бусад" : `${profile.grade}-р анги`}</Badge>}
                </div>
                {profile.subjects && (profile.subjects as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(profile.subjects as string[]).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href="/profile/edit"><Edit className="size-4 mr-1" />Засах</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <StatsRow total={submitted.length} avg={avgScore} best={bestScore} streak={streak} />

        <Card>
          <CardHeader><CardTitle className="text-base">Идэвх</CardTitle></CardHeader>
          <CardContent>
            <ActivityHeatmap attempts={submitted.map((a) => ({ submitted_at: a.submitted_at, score_percentage: a.score_percentage ?? 0 }))} />
          </CardContent>
        </Card>

        {radarData.length >= 3 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Хичээлийн задаргаа</CardTitle></CardHeader>
            <CardContent><ScoreRadar scores={radarData} /></CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Эрэмбийн оноо</p>
                <p className="text-3xl font-bold">{(profile.rank_score ?? 0).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">#{rankPosition} нийт сурагчдын дотор</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Хамгийн өндөр</p>
                <p className="text-2xl font-bold">{bestScore != null ? `${bestScore.toFixed(0)}%` : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {submitted.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Сүүлийн шалгалтууд</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {submitted.slice(0, 8).map((a) => {
                const examTitle = (a.exam_set as unknown as { title: string } | null)?.title ?? "—"
                return (
                  <div key={a.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm truncate max-w-[60%]">{examTitle}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <ScoreBadge score={a.score_percentage ?? 0} />
                      {a.submitted_at && <span className="text-xs text-muted-foreground">{new Date(a.submitted_at).toLocaleDateString("mn-MN")}</span>}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}

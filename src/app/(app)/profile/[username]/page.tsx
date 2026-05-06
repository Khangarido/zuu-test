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
import { Flame, Trophy, Target, TrendingUp, Edit } from "lucide-react"

export const dynamic = "force-dynamic"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : score >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {score.toFixed(0)}%
    </span>
  )
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: viewer } = await supabase
    .from("profiles")
    .select("full_name, role, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const admin = getSupabaseAdmin()

  // Fetch target profile
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, full_name, first_name, last_name, username, avatar_url, grade, subjects, rank_score, rank_tier"
    )
    .eq("username", username)
    .maybeSingle()

  if (!profile) notFound()

  const isOwnProfile = user.id === profile.id

  // Attempts stats
  const { data: attempts } = await admin
    .from("attempts")
    .select("id, score_percentage, submitted_at, exam_set:exam_sets(title)")
    .eq("user_id", profile.id)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })

  const submitted = attempts ?? []
  const avgScore = submitted.length
    ? submitted.reduce((s, a) => s + (a.score_percentage ?? 0), 0) / submitted.length
    : null
  const bestScore = submitted.length
    ? Math.max(...submitted.map((a) => a.score_percentage ?? 0))
    : null

  // Rank position
  const { count: rankAbove } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gt("rank_score", profile.rank_score ?? 0)
    .eq("role", "student")

  const rankPosition = (rankAbove ?? 0) + 1

  // Streak
  const uniqueDays = new Set(
    submitted.map((a) => {
      if (!a.submitted_at) return ""
      const d = new Date(a.submitted_at)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }).filter(Boolean)
  )
  let streak = 0
  const cursor = new Date(); cursor.setHours(0, 0, 0, 0)
  while (uniqueDays.has(cursor.getTime())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const viewerRole = viewer?.role === "admin" || viewer?.role === "superadmin" ? "admin" : "student"
  const displayName = profile.full_name ?? `${profile.last_name ?? ""} ${profile.first_name ?? ""}`.trim()
  const tier = profile.rank_tier ?? "Bronze"
  const tierBadge = `${getTierEmoji(tier)} ${tier}`

  return (
    <AppShell
      fullName={viewer?.full_name ?? ""}
      email={user.email ?? ""}
      role={viewerRole as "student" | "admin"}
      isAdmin={viewerRole === "admin"}
      username={viewer?.username ?? null}
      avatarUrl={viewer?.avatar_url ?? null}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <Avatar className="size-20 ring-4 ring-primary/10 shrink-0">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xl font-bold">
                  {initials(displayName) || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <p className="text-muted-foreground text-sm">@{profile.username}</p>

                <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${getTierColor(tier)}`}>
                    {tierBadge}
                  </span>
                  {profile.grade && (
                    <Badge variant="secondary">
                      {profile.grade === "graduated" ? "Төгссөн" : profile.grade === "other" ? "Бусад" : `${profile.grade}-р анги`}
                    </Badge>
                  )}
                </div>

                {profile.subjects && profile.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                    {(profile.subjects as string[]).map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {isOwnProfile && (
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href="/profile/edit">
                    <Edit className="size-4 mr-1" />
                    Засах
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Trophy className="size-3.5" />
                <span className="text-xs">Эрэмбэ</span>
              </div>
              <div className="text-2xl font-bold">#{rankPosition}</div>
              <p className="text-xs text-muted-foreground">нийт сурагчдын дотор</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Target className="size-3.5" />
                <span className="text-xs">Оролдлого</span>
              </div>
              <div className="text-2xl font-bold">{submitted.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <TrendingUp className="size-3.5" />
                <span className="text-xs">Дундаж</span>
              </div>
              <div className="text-2xl font-bold">
                {avgScore != null ? `${avgScore.toFixed(0)}%` : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Flame className="size-3.5 text-orange-500" />
                <span className="text-xs">Streak</span>
              </div>
              <div className="text-2xl font-bold">
                {streak > 0 ? `🔥 ${streak}` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rank score detail */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Оноо</p>
                <p className="text-3xl font-bold">{(profile.rank_score ?? 0).toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Хамгийн өндөр</p>
                <p className="text-xl font-semibold">
                  {bestScore != null ? `${bestScore.toFixed(0)}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent attempts */}
        {submitted.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Сүүлийн шалгалтууд</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {submitted.slice(0, 5).map((a) => {
                const examTitle =
                  (a.exam_set as unknown as { title: string } | null)?.title ?? "—"
                return (
                  <div key={a.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm truncate max-w-[60%]">{examTitle}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <ScoreBadge score={a.score_percentage ?? 0} />
                      {a.submitted_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.submitted_at).toLocaleDateString("mn-MN")}
                        </span>
                      )}
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

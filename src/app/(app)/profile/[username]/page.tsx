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
import { expTier } from "@/lib/ranking-utils"
import { ActivityHeatmap } from "@/components/activity-heatmap"
import { Edit, Zap } from "lucide-react"

export const dynamic = "force-dynamic"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

function gradeLabel(grade: string | null | undefined) {
  if (!grade) return null
  if (grade === "graduated") return "Төгссөн"
  if (grade === "other") return "Бусад"
  return `${grade}-р анги`
}

function joinedLabel(joinedAt: string | null | undefined) {
  if (!joinedAt) return null
  const d = new Date(joinedAt)
  return `${d.getFullYear()} оны ${d.getMonth() + 1}-р сард нэгдсэн`
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : score >= 60
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: viewer } = await supabase
    .from("profiles")
    .select("full_name, role, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, full_name, first_name, last_name, username, avatar_url, grade, school, subjects, rank_score, rank_tier, bio, is_teacher, display_name, joined_at, exp_points"
    )
    .eq("username", username)
    .maybeSingle()
  if (!profile) notFound()

  const isOwnProfile = user.id === profile.id

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

  const viewerRole =
    viewer?.role === "admin" || viewer?.role === "superadmin" ? "admin" : "student"
  const displayName =
    (profile.display_name as string | null) ??
    profile.full_name ??
    `${profile.last_name ?? ""} ${profile.first_name ?? ""}`.trim()
  const tier = (profile.rank_tier as string | null) ?? "Bronze"
  const expPoints = (profile.exp_points as number | null) ?? 0
  const expInfo = expTier(expPoints)
  const school = (profile.school as string | null) ?? null
  const grade = gradeLabel(profile.grade as string | null)
  const joined = joinedLabel(profile.joined_at as string | null)

  const heatmapAttempts = submitted
    .filter((a) => a.submitted_at)
    .map((a) => ({ submitted_at: a.submitted_at as string }))

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
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* ── Left sidebar ── */}
          <aside className="space-y-5">
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              <Avatar className="size-24 ring-4 ring-primary/20 shrink-0">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-2xl font-bold">
                  {initials(displayName) || "?"}
                </AvatarFallback>
              </Avatar>

              <h1 className="text-2xl font-bold mt-4 leading-tight">{displayName}</h1>
              <p className="text-muted-foreground text-sm">@{profile.username}</p>

              {(school || grade) && (
                <p className="text-sm text-muted-foreground mt-2">
                  {[school, grade].filter(Boolean).join(" · ")}
                </p>
              )}

              {profile.is_teacher && (
                <Badge className="mt-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-0">
                  Багш
                </Badge>
              )}

              {profile.bio && (
                <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{profile.bio as string}</p>
              )}
            </div>

            {/* Tier badges */}
            <div className="flex flex-col gap-2">
              <span
                className="inline-flex items-center justify-center lg:justify-start gap-1.5 rounded-full px-4 py-2 text-sm font-bold w-fit mx-auto lg:mx-0"
                style={{ backgroundColor: expInfo.color + "22", color: expInfo.color }}
              >
                <Zap className="size-4" />
                {expInfo.tier}
              </span>
              <span
                className={`inline-flex items-center justify-center lg:justify-start gap-1 rounded-full px-4 py-1.5 text-sm font-semibold w-fit mx-auto lg:mx-0 ${getTierColor(tier)}`}
              >
                {getTierEmoji(tier)} {tier}
              </span>
            </div>

            <p className="text-center lg:text-left text-lg font-bold" style={{ color: expInfo.color }}>
              {new Intl.NumberFormat("mn-MN").format(expPoints)} XP
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border bg-card p-3">
              <div className="text-center">
                <p className="text-lg font-bold">{submitted.length}</p>
                <p className="text-[10px] text-muted-foreground">Шалгалт</p>
              </div>
              <div className="text-center border-x">
                <p className="text-lg font-bold">{avgScore != null ? `${avgScore.toFixed(0)}%` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Дундаж</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{bestScore != null ? `${bestScore.toFixed(0)}%` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Хамгийн өндөр</p>
              </div>
            </div>

            {joined && (
              <p className="text-xs text-muted-foreground text-center lg:text-left">{joined}</p>
            )}

            {profile.subjects && (profile.subjects as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center lg:justify-start">
                {(profile.subjects as string[]).map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            {isOwnProfile && (
              <Button variant="outline" size="sm" asChild className="w-full lg:w-auto">
                <Link href="/profile/edit">
                  <Edit className="size-4 mr-1.5" />
                  Профайл засах
                </Link>
              </Button>
            )}
          </aside>

          {/* ── Right main ── */}
          <main className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  Шалгалтын идэвх — сүүлийн 12 сар
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityHeatmap attempts={heatmapAttempts} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Сүүлийн идэвх</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {submitted.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Шалгалтын түүх байхгүй
                  </p>
                ) : (
                  submitted.slice(0, 10).map((a) => {
                    const examTitle =
                      (a.exam_set as unknown as { title: string } | null)?.title ?? "—"
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <Link
                          href={`/results/${a.id}`}
                          className="text-sm font-medium hover:underline truncate flex-1 min-w-0"
                        >
                          {examTitle}
                        </Link>
                        <div className="flex items-center gap-2 shrink-0">
                          <ScoreBadge score={a.score_percentage ?? 0} />
                          {a.submitted_at && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(a.submitted_at).toLocaleDateString("mn-MN", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </AppShell>
  )
}

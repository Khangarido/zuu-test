import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { getTierColor, getTierEmoji } from "@/lib/ranking"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

const GRADE_LABELS: Record<string, string> = { graduated: "Төгссөн", other: "Бусад" }
const gradeLabel = (g: string | null) => g ? (GRADE_LABELS[g] ?? `${g}-р анги`) : "—"

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

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: viewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (!viewer || viewer.role !== "superadmin") redirect("/admin")

  const admin = getSupabaseAdmin()

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, username, avatar_url, grade, subjects, rank_score, rank_tier, created_at, email")
    .eq("id", id)
    .eq("role", "student")
    .maybeSingle()

  if (!profile) notFound()

  const { data: attempts } = await admin
    .from("attempts")
    .select(
      "id, status, score_percentage, correct_count, total_count, started_at, submitted_at, exam_set:exam_sets(title)"
    )
    .eq("user_id", id)
    .order("started_at", { ascending: false })

  const submitted = (attempts ?? []).filter((a) => a.status === "submitted")
  const avgScore = submitted.length
    ? submitted.reduce((s, a) => s + (a.score_percentage ?? 0), 0) / submitted.length
    : null

  const displayName = profile.full_name as string | null
  const tier = (profile.rank_tier as string) ?? "Bronze"

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/students">
          <ArrowLeft className="size-4 mr-1" />
          Буцах
        </Link>
      </Button>

      {/* Profile header */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <Avatar className="size-16 ring-4 ring-primary/10 shrink-0">
              <AvatarImage src={(profile.avatar_url as string | null) ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-lg font-bold">
                {initials(displayName ?? "") || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h1 className="text-xl font-bold">{displayName ?? "—"}</h1>
              {profile.username && (
                <p className="text-sm text-muted-foreground">@{profile.username as string}</p>
              )}
              <p className="text-sm text-muted-foreground">{profile.email as string}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${getTierColor(tier)}`}>
                  {getTierEmoji(tier)} {tier}
                </span>
                <Badge variant="secondary">{gradeLabel(profile.grade as string | null)}</Badge>
                <span className="text-sm text-muted-foreground">
                  Бүртгэгдсэн: {new Date(profile.created_at as string).toLocaleDateString("mn-MN")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Rank оноо",    value: ((profile.rank_score as number) ?? 0).toFixed(1) },
          { label: "Оролдлого",   value: submitted.length },
          { label: "Дундаж оноо", value: avgScore != null ? `${avgScore.toFixed(0)}%` : "—" },
          {
            label: "Хамгийн өндөр",
            value: submitted.length
              ? `${Math.max(...submitted.map((a) => a.score_percentage ?? 0)).toFixed(0)}%`
              : "—",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Бүх оролдлогууд ({attempts?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Шалгалт</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Оноо</TableHead>
                  <TableHead className="text-right">Зөв / Нийт</TableHead>
                  <TableHead>Эхэлсэн</TableHead>
                  <TableHead>Дууссан</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(attempts ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Оролдлого алга
                    </TableCell>
                  </TableRow>
                ) : (
                  (attempts ?? []).map((a) => {
                    const title =
                      (a.exam_set as unknown as { title: string } | null)?.title ?? "—"
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm font-medium">{title}</TableCell>
                        <TableCell>
                          <Badge variant={a.status === "submitted" ? "default" : "secondary"}>
                            {a.status === "submitted" ? "Дууссан" : "Дуусаагүй"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {a.score_percentage != null
                            ? <ScoreBadge score={a.score_percentage} />
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {a.correct_count != null && a.total_count != null
                            ? `${a.correct_count}/${a.total_count}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.started_at
                            ? new Date(a.started_at).toLocaleDateString("mn-MN")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.submitted_at
                            ? new Date(a.submitted_at).toLocaleDateString("mn-MN")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

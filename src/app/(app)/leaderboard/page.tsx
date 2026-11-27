import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AppShell } from "@/components/app-shell"
import { LeaderboardClient } from "./_client"
import { GRADE_VALUES, SUBJECT_VALUES, outsideRank, shapeRows, type Identity, type RankRow } from "@/lib/leaderboard"
import { Trophy } from "lucide-react"

export const dynamic = "force-dynamic"

type Search = { grade?: string; subject?: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const grade = GRADE_VALUES.includes(sp.grade ?? "") ? (sp.grade as string) : null
  const subject = SUBJECT_VALUES.includes(sp.subject ?? "") ? (sp.subject as string) : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: viewer } = await supabase
    .from("profiles")
    .select("full_name, role, username, avatar_url, grade, subjects, rank_score, exp_points")
    .eq("id", user.id)
    .maybeSingle()

  const viewerRole = viewer?.role === "admin" || viewer?.role === "superadmin" ? "admin" : "student"
  const isAdminViewer = viewerRole === "admin"
  const viewerIdentity: Identity = {
    name: (viewer?.full_name as string | null) ?? null,
    username: (viewer?.username as string | null) ?? null,
    avatar_url: (viewer?.avatar_url as string | null) ?? null,
    grade: (viewer?.grade as string | null) ?? null,
  }

  const admin = getSupabaseAdmin()
  const scoped = (q: any) => {
    let out = q
    if (grade) out = out.eq("grade", grade)
    if (subject) out = out.contains("subjects", [subject])
    return out
  }
  const viewerInScope =
    viewerRole === "student" &&
    (!grade || viewer?.grade === grade) &&
    (!subject || ((viewer?.subjects as string[] | null) ?? []).includes(subject))

  // Students never get other students' names: the query does not even select them.
  const idCols = isAdminViewer ? ", full_name, username, avatar_url, grade" : ""
  const toIdentity = (r: any): Identity | undefined =>
    isAdminViewer
      ? { name: r.full_name ?? null, username: r.username ?? null, avatar_url: r.avatar_url ?? null, grade: r.grade ?? null }
      : undefined

  // ── Score ranking: top 100 ───────────────────────────────────────────────
  const { data: scoreData } = await scoped(
    admin.from("profiles").select(`id, rank_score, rank_tier${idCols}`).eq("role", "student")
  ).order("rank_score", { ascending: false }).order("id").limit(100)
  const scoreRaw = (scoreData ?? []) as any[]
  const scoreRows: RankRow[] = shapeRows(
    scoreRaw.map((r) => ({ id: r.id, value: r.rank_score, tier: r.rank_tier, identity: toIdentity(r) })),
    { viewerId: user.id, viewerIdentity, showIdentity: isAdminViewer }
  )

  const { count: scoreTotal } = await scoped(
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")
  )

  let scoreMe: RankRow | null = null
  if (viewerInScope && !scoreRows.some((r) => r.me)) {
    const myScore = (viewer?.rank_score as number | null) ?? 0
    const { count } = await scoped(
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").gt("rank_score", myScore)
    )
    scoreMe = { rank: outsideRank(count), value: myScore, tier: null, me: true, identity: viewerIdentity }
  }

  // ── EXP ranking: top 50 ──────────────────────────────────────────────────
  const { data: expData } = await admin
    .from("profiles")
    .select(`id, exp_points${idCols}`)
    .eq("role", "student")
    .order("exp_points", { ascending: false })
    .order("id")
    .limit(50)
  const expRows: RankRow[] = shapeRows(
    ((expData ?? []) as any[]).map((r) => ({ id: r.id, value: r.exp_points, tier: null, identity: toIdentity(r) })),
    { viewerId: user.id, viewerIdentity, showIdentity: isAdminViewer }
  )
  let expMe: RankRow | null = null
  if (viewerRole === "student" && !expRows.some((r) => r.me)) {
    const myExp = (viewer?.exp_points as number | null) ?? 0
    const { count } = await admin
      .from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").gt("exp_points", myExp)
    expMe = { rank: outsideRank(count), value: myExp, tier: null, me: true, identity: viewerIdentity }
  }

  return (
    <AppShell
      fullName={viewerIdentity.name ?? ""}
      email={user.email ?? ""}
      role={viewerRole as "student" | "admin"}
      isAdmin={isAdminViewer}
      username={viewerIdentity.username}
      avatarUrl={viewerIdentity.avatar_url}
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
              {isAdminViewer ? "Шилдэг 100 сурагч" : "Бусад сурагчийн нэр харагдахгүй. Зөвхөн таны байр болон оноо харагдана."}
            </p>
          </div>
        </div>

        <LeaderboardClient
          scoreRows={scoreRows}
          scoreTotal={scoreTotal ?? scoreRows.length}
          scoreMe={scoreMe}
          expRows={expRows}
          expMe={expMe}
          isAdmin={isAdminViewer}
          filters={{ grade: grade ?? "all", subject: subject ?? "all" }}
        />
      </div>
    </AppShell>
  )
}

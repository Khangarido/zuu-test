import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ResultsTable } from "./_components"
import type { StudentResult } from "./_components"
import { BarChart2, ChevronRight, ClipboardList, Users, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type SP = { subject_id?: string; exam_set_id?: string }

const ICONS: Record<string, string> = {
  "\u041c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a": "\ud83d\udcd0",
  "\u0410\u043d\u0433\u043b\u0438 \u0445\u044d\u043b": "\ud83c\uddec\ud83c\udde7",
  "\u0413\u0430\u0437\u0430\u0440\u0437\u04af\u0439": "\ud83c\udf0d",
  "\u0424\u0438\u0437\u0438\u043a": "\u26a1",
  "\u0425\u0438\u043c\u0438": "\ud83e\uddea",
  "\u0411\u0438\u043e\u043b\u043e\u0433\u0438": "\ud83e\uddec",
  "\u0422\u04af\u04af\u0445": "\ud83d\udcdc",
  "\u041d\u0438\u0439\u0433\u044d\u043c": "\ud83c\udfd9\ufe0f",
  "\u041c\u044d\u0434\u044d\u044d\u043b\u044d\u043b \u0437\u04af\u0439": "\ud83d\udcbb",
  "\u041c\u043e\u043d\u0433\u043e\u043b \u0445\u044d\u043b": "\ud83c\uddf2\ud83c\uddf3",
}
function icon(name: string) { return ICONS[name] ?? "\ud83d\udcda" }

function scoreColor(s: number) {
  if (s >= 70) return "text-emerald-600 dark:text-emerald-400"
  if (s >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

export default async function ResultsPage({ searchParams }: { searchParams?: Promise<SP> | SP }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: viewer } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (!viewer || !["admin", "superadmin"].includes(viewer.role)) redirect("/admin")

  const params = await Promise.resolve(searchParams ?? {})
  const sid = params.subject_id ?? ""
  const eid = params.exam_set_id ?? ""
  const admin = getSupabaseAdmin()

  /* ── LEVEL 3: Student table ── */
  if (sid && eid) {
    const [{ data: examSet }, { data: subjectRow }, { data: attemptRows }] = await Promise.all([
      admin.from("exam_sets").select("id, title").eq("id", eid).maybeSingle(),
      admin.from("subjects").select("id, name").eq("id", sid).maybeSingle(),
      admin.from("attempts").select("id, user_id, score_percentage, correct_count, total_count, started_at, submitted_at")
        .eq("exam_set_id", eid).eq("status", "submitted").order("score_percentage", { ascending: false }),
    ])

    const userIds = [...new Set((attemptRows ?? []).map((a) => a.user_id as string))]
    const { data: profileRows } = userIds.length
      ? await admin.from("profiles").select("id, full_name, username, avatar_url, rank_tier").in("id", userIds)
      : { data: [] }

    const pm = new Map((profileRows ?? []).map((p) => [p.id, { full_name: p.full_name as string|null, username: p.username as string|null, avatar_url: p.avatar_url as string|null, rank_tier: p.rank_tier as string|null }]))

    const students: StudentResult[] = (attemptRows ?? []).map((a) => {
      const prof = pm.get(a.user_id as string) ?? { full_name: null, username: null, avatar_url: null, rank_tier: null }
      return { attempt_id: a.id as string, user_id: a.user_id as string, ...prof,
        score_percentage: (a.score_percentage as number) ?? 0, correct_count: (a.correct_count as number) ?? 0,
        total_count: (a.total_count as number) ?? 0, started_at: a.started_at as string|null, submitted_at: a.submitted_at as string|null }
    })

    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <Link href="/admin/results" className="hover:text-foreground transition-colors">\u0414\u04af\u043d\u0433\u0438\u0439\u043d \u0442\u0430\u0439\u043b\u0430\u043d</Link>
          <ChevronRight className="size-3.5" />
          <Link href={`/admin/results?subject_id=${sid}`} className="hover:text-foreground transition-colors">{subjectRow?.name}</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{examSet?.title}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart2 className="size-6 text-primary" />{examSet?.title}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">{icon(subjectRow?.name ?? "")} {subjectRow?.name}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 cursor-pointer">
            <Link href={`/admin/results?subject_id=${sid}`}><ArrowLeft className="size-4" />\u0411\u0443\u0446\u0430\u0445</Link>
          </Button>
        </div>
        <Card className="border-border/60 shadow-sm"><CardContent className="pt-6">
          <ResultsTable students={students} examTitle={examSet?.title ?? "exam"} />
        </CardContent></Card>
      </div>
    )
  }

  /* ── LEVEL 2: Exam sets ── */
  if (sid) {
    const [{ data: subjectRow }, { data: examSetRows }] = await Promise.all([
      admin.from("subjects").select("id, name").eq("id", sid).maybeSingle(),
      admin.from("exam_sets").select("id, title").eq("subject_id", sid).order("title", { ascending: true }),
    ])
    const examIds = (examSetRows ?? []).map((e) => e.id as string)
    const { data: attemptsRaw } = examIds.length
      ? await admin.from("attempts").select("exam_set_id, score_percentage").in("exam_set_id", examIds).eq("status", "submitted")
      : { data: [] }

    const sm: Record<string, { count: number; total: number; pass: number }> = {}
    for (const a of attemptsRaw ?? []) {
      const id = a.exam_set_id as string
      if (!sm[id]) sm[id] = { count: 0, total: 0, pass: 0 }
      sm[id].count++; sm[id].total += (a.score_percentage as number) ?? 0
      if (((a.score_percentage as number) ?? 0) >= 70) sm[id].pass++
    }

    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/results" className="hover:text-foreground transition-colors">\u0414\u04af\u043d\u0433\u0438\u0439\u043d \u0442\u0430\u0439\u043b\u0430\u043d</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{subjectRow?.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{icon(subjectRow?.name ?? "")} {subjectRow?.name}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{(examSetRows ?? []).length} \u0448\u0430\u043b\u0433\u0430\u043b\u0442</p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 cursor-pointer">
            <Link href="/admin/results"><ArrowLeft className="size-4" />\u0411\u0443\u0446\u0430\u0445</Link>
          </Button>
        </div>
        <div className="space-y-3">
          {(examSetRows ?? []).length === 0
            ? <Card className="border-dashed border-border/60"><CardContent className="py-12 text-center text-muted-foreground text-sm">\u042d\u043d\u044d \u0445\u0438\u0447\u044d\u044d\u043b\u0434 \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u0431\u0430\u0439\u0445\u0433\u04af\u0439 \u0431\u0430\u0439\u043d\u0430.</CardContent></Card>
            : (examSetRows ?? []).map((exam) => {
                const stats = sm[exam.id as string]
                const count = stats?.count ?? 0
                const avg   = count ? stats.total / count : null
                const pass  = count ? (stats.pass / count) * 100 : null
                return (
                  <Link key={exam.id as string} href={`/admin/results?subject_id=${sid}&exam_set_id=${exam.id}`}>
                    <Card className="border-border/60 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="py-4 px-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <ClipboardList className="size-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate group-hover:text-primary transition-colors">{exam.title as string}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{count} \u043e\u0440\u043e\u043b\u0434\u043b\u043e\u0433\u043e</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 shrink-0">
                            {avg !== null && <div className="text-right hidden sm:block"><p className="text-xs text-muted-foreground">\u0414\u0443\u043d\u0434\u0430\u0436</p><p className={cn("font-bold tabular-nums", scoreColor(avg))}>{avg.toFixed(1)}%</p></div>}
                            {pass !== null && <div className="text-right hidden sm:block"><p className="text-xs text-muted-foreground">\u0422\u044d\u043d\u0446\u0441\u044d\u043d</p><p className={cn("font-bold tabular-nums", scoreColor(pass))}>{pass.toFixed(0)}%</p></div>}
                            <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                              <Users className="size-4" /><span className="text-sm font-medium tabular-nums">{count}</span>
                              <ChevronRight className="size-4 ml-1" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
        </div>
      </div>
    )
  }

  /* ── LEVEL 1: Subject list ── */
  const [{ data: subjectRows }, { data: examSetRaw }, { data: attemptsRaw }] = await Promise.all([
    admin.from("subjects").select("id, name").order("name", { ascending: true }),
    admin.from("exam_sets").select("id, subject_id"),
    admin.from("attempts").select("exam_set_id").eq("status", "submitted"),
  ])

  const s2e = new Map<string, string[]>()
  for (const e of examSetRaw ?? []) {
    const sid2 = e.subject_id as string
    if (!s2e.has(sid2)) s2e.set(sid2, [])
    s2e.get(sid2)!.push(e.id as string)
  }
  const ea = new Map<string, number>()
  for (const a of attemptsRaw ?? []) ea.set(a.exam_set_id as string, (ea.get(a.exam_set_id as string) ?? 0) + 1)

  const subjects = (subjectRows ?? []).map((s) => {
    const ids = s2e.get(s.id as string) ?? []
    return { id: s.id as string, name: s.name as string, examCount: ids.length, attemptCount: ids.reduce((sum, id) => sum + (ea.get(id) ?? 0), 0) }
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart2 className="size-6 text-primary" />\u0414\u04af\u043d\u0433\u0438\u0439\u043d \u0442\u0430\u0439\u043b\u0430\u043d
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">\u0425\u0438\u0447\u044d\u044d\u043b\u044d\u044d\u0440 \u0448\u04af\u04af\u043d \u0448\u0430\u043b\u0433\u0430\u043b\u0442\u044b\u043d \u0434\u04af\u043d, \u043e\u0440\u043e\u043b\u0446\u043e\u0433\u0447\u0434\u044b\u0433 \u0445\u0430\u0440\u043d\u0430 \u0443\u0443.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subjects.map((s) => (
          <Link key={s.id} href={`/admin/results?subject_id=${s.id}`}>
            <Card className="border-border/60 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group h-full">
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{icon(s.name)}</span>
                    <div>
                      <p className="font-semibold group-hover:text-primary transition-colors">{s.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><ClipboardList className="size-3" />{s.examCount} \u0448\u0430\u043b\u0433\u0430\u043b\u0442</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="size-3" />{s.attemptCount} \u043e\u0440\u043e\u043b\u0434\u043b\u043e\u0433\u043e</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

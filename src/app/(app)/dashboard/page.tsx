import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/app-shell"
import { CheckCircle2, TrendingUp, BookOpen } from "lucide-react"
import { DashboardClient } from "./dashboard-client"
import type { OwnedExam, AvailableExam, SubmittedAttempt } from "./dashboard-client"

export const dynamic = "force-dynamic"

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ payment?: string }> | { payment?: string } }) {
  const sp = await Promise.resolve(searchParams ?? {})
  const paymentStatus = sp.payment === "success" ? "success" : sp.payment === "cancelled" ? "cancelled" : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, first_name, role, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const { data: accessRows } = await supabase
    .from("access")
    .select("exam_set:exam_sets(id, title, description, duration_minutes)")
    .eq("user_id", user.id)

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, status, score_percentage, submitted_at, exam_set:exam_sets(id, title)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })

  const accessIds = (accessRows ?? [])
    .map((r) => (r.exam_set as unknown as { id: string } | null)?.id)
    .filter((x): x is string => Boolean(x))

  let availableQuery = supabase
    .from("exam_sets")
    .select("id, title, description, duration_minutes, price, is_new, is_recommended")
    .eq("is_active", true)
  if (accessIds.length > 0) {
    availableQuery = availableQuery.not("id", "in", `(${accessIds.join(",")})`)
  }
  let { data: available, error: availableError } = await availableQuery
  if (availableError) {
    const fallback = supabase.from("exam_sets").select("id, title, description, duration_minutes, price").eq("is_active", true)
    if (accessIds.length > 0) fallback.not("id", "in", `(${accessIds.join(",")})`)
    const res = await fallback
    available = res.data as typeof available
  }

  const submitted = (attempts ?? []).filter((a) => a.status === "submitted")
  const avgScore = submitted.length > 0
    ? submitted.reduce((sum, a) => sum + (a.score_percentage ?? 0), 0) / submitted.length
    : null

  const fullName  = (profile?.full_name as string | null) ?? ""
  const firstName = (profile?.first_name as string | null) || fullName.split(" ").at(-1) || "сурагч"
  const role      = profile?.role === "admin" || profile?.role === "superadmin" ? "admin" : "student"

  const owned: OwnedExam[] = (accessRows ?? []).map((row) => {
    const e = row.exam_set as unknown as { id: string; title: string; description: string | null; duration_minutes: number } | null
    if (!e) return null
    const last = submitted.filter((a) => (a.exam_set as unknown as { id: string } | null)?.id === e.id).at(0)
    return {
      id: e.id, title: e.title, description: e.description ?? null,
      duration_minutes: e.duration_minutes,
      lastAttemptId: last?.id ?? null,
      lastScore: last ? (last.score_percentage ?? 0) : null,
    }
  }).filter((x): x is OwnedExam => x !== null)

  const availableExams: AvailableExam[] = (available ?? []).map((e) => ({
    id: e.id as string, title: e.title as string,
    description: (e.description as string | null) ?? null,
    duration_minutes: e.duration_minutes as number,
    price: (e.price as number) ?? 0,
    is_new: (e.is_new as boolean) ?? false,
    is_recommended: (e.is_recommended as boolean) ?? false,
  }))

  const history: SubmittedAttempt[] = submitted.map((a) => {
    const e = a.exam_set as unknown as { id: string; title: string } | null
    return {
      id: a.id as string, examId: e?.id ?? "",
      examTitle: e?.title ?? "—",
      score: (a.score_percentage as number) ?? 0,
      submittedAt: (a.submitted_at as string | null) ?? null,
    }
  })

  return (
    <AppShell
      fullName={fullName}
      email={user.email ?? ""}
      role={role}
      isAdmin={role === "admin"}
      username={(profile?.username as string | null) ?? null}
      avatarUrl={(profile?.avatar_url as string | null) ?? null}
    >
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-6 sm:p-8 text-white shadow-lg">
          <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-white/5" />
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm font-medium mb-1">Сайн байна уу,</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{firstName}</h1>
            <p className="mt-2 text-indigo-200 text-sm">Өнөөдөр ямар шалгалт өгөх вэ?</p>
            <div className="mt-6 grid grid-cols-3 gap-4 sm:gap-6">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 text-indigo-200 mb-1">
                  <BookOpen className="size-3.5" />
                  <span className="text-xs">Миний шалгалт</span>
                </div>
                <div className="text-2xl font-bold">{owned.length}</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 text-indigo-200 mb-1">
                  <CheckCircle2 className="size-3.5" />
                  <span className="text-xs">Дууссан</span>
                </div>
                <div className="text-2xl font-bold">{submitted.length}</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 text-indigo-200 mb-1">
                  <TrendingUp className="size-3.5" />
                  <span className="text-xs">Дундаж оноо</span>
                </div>
                <div className="text-2xl font-bold">
                  {avgScore != null ? `${avgScore.toFixed(0)}%` : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DashboardClient
          owned={owned}
          available={availableExams}
          history={history}
          paymentStatus={paymentStatus}
        />
      </div>
    </AppShell>
  )
}
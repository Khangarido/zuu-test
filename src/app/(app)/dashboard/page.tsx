import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AppShell } from "@/components/app-shell"
import { DashboardClient } from "./dashboard-client"
import type {
  ClassTimer,
  SubjectAttempt,
  AttemptStat,
  RecentAttempt,
} from "./dashboard-client"
import type {
  OwnedExamCard,
  AvailableExamCard,
  HistoryExamCard,
} from "@/components/exam-omr-card"
import { DEFAULT_CARD_COLOR1, DEFAULT_CARD_COLOR2 } from "@/lib/exam-card-colors"

export const dynamic = "force-dynamic"

function normalizeSubjectName(raw: unknown): string {
  const es = Array.isArray(raw) ? raw[0] : raw
  if (!es || typeof es !== "object") return "Бусад"
  const subjects = (es as { subjects?: unknown }).subjects
  const sub = Array.isArray(subjects) ? subjects[0] : subjects
  return (sub as { name?: string } | null)?.name ?? "Бусад"
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ payment?: string }> | { payment?: string }
}) {
  const sp = await Promise.resolve(searchParams ?? {})
  const paymentStatus =
    sp.payment === "success" ? "success" : sp.payment === "cancelled" ? "cancelled" : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = getSupabaseAdmin()

  // Хамааралгүй query-уудыг зэрэг ажиллуулна
  const [
    { data: profile },
    { data: accessRows },
    { data: grantedAccessRows },
    { data: attempts },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, first_name, role, username, avatar_url, exp_points")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("access")
      .select("exam_set:exam_sets(id, title, description, duration_minutes, card_color1, card_color2)")
      .eq("user_id", user.id),
    supabase
      .from("user_exam_access")
      .select("exam_set_id")
      .eq("user_id", user.id),
    supabase
      .from("attempts")
      .select("id, status, score_percentage, submitted_at, time_spent_seconds, exam_set:exam_sets(id, title, card_color1, card_color2)")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
  ])

  const grantedAccessIds = new Set(
    (grantedAccessRows ?? []).map((r) => r.exam_set_id as string).filter(Boolean)
  )

  const submitted = (attempts ?? []).filter((a) => a.status === "submitted")

  const accessIds = (accessRows ?? [])
    .map((r) => (r.exam_set as unknown as { id: string } | null)?.id)
    .filter((x): x is string => Boolean(x))

  let availableQuery = supabase
    .from("exam_sets")
    .select("id, title, description, duration_minutes, price, is_new, is_recommended, card_color1, card_color2")
    .eq("is_active", true)
  if (accessIds.length > 0) {
    availableQuery = availableQuery.not("id", "in", `(${accessIds.join(",")})`)
  }
  const { data: available, error: availableError } = await availableQuery
  const availableExamsRaw =
    availableError
      ? (
          await (() => {
            let q = supabase
              .from("exam_sets")
              .select("id, title, description, duration_minutes, price, is_new, is_recommended, card_color1, card_color2")
              .eq("is_active", true)
            if (accessIds.length > 0) q = q.not("id", "in", `(${accessIds.join(",")})`)
            return q
          })()
        ).data
      : available

  const owned: OwnedExamCard[] = (accessRows ?? [])
    .map((row) => {
      const e = row.exam_set as unknown as {
        id: string
        title: string
        duration_minutes: number
        card_color1: string | null
        card_color2: string | null
      } | null
      if (!e) return null
      const last = submitted.filter(
        (a) => (a.exam_set as unknown as { id: string } | null)?.id === e.id
      ).at(0)
      return {
        id: e.id,
        title: e.title,
        duration_minutes: e.duration_minutes,
        card_color1: e.card_color1 ?? DEFAULT_CARD_COLOR1,
        card_color2: e.card_color2 ?? DEFAULT_CARD_COLOR2,
        lastAttemptId: last?.id ?? null,
        lastScore: last ? (last.score_percentage ?? 0) : null,
      }
    })
    .filter((x): x is OwnedExamCard => x !== null)

  const availableExams: AvailableExamCard[] = (availableExamsRaw ?? []).map((e) => {
    const price = (e.price as number) ?? 0
    return {
      id: e.id as string,
      title: e.title as string,
      duration_minutes: e.duration_minutes as number,
      price,
      is_new: (e.is_new as boolean) ?? false,
      is_recommended: (e.is_recommended as boolean) ?? false,
      card_color1: (e.card_color1 as string | null) ?? DEFAULT_CARD_COLOR1,
      card_color2: (e.card_color2 as string | null) ?? DEFAULT_CARD_COLOR2,
      hasAccess: price === 0 || grantedAccessIds.has(e.id as string),
    }
  })

  const history: HistoryExamCard[] = submitted.map((a) => {
    const e = a.exam_set as unknown as {
      title: string
      card_color1: string | null
      card_color2: string | null
    } | null
    return {
      id: a.id as string,
      examTitle: e?.title ?? "—",
      score: (a.score_percentage as number) ?? 0,
      submittedAt: (a.submitted_at as string | null) ?? null,
      card_color1: e?.card_color1 ?? DEFAULT_CARD_COLOR1,
      card_color2: e?.card_color2 ?? DEFAULT_CARD_COLOR2,
    }
  })

  const [
    { data: subjectAttemptsRaw },
    { data: allAttemptsRaw },
    { count: totalSubjects },
  ] = await Promise.all([
    admin
      .from("attempts")
      .select("exam_set_id, score_percentage, exam_sets(title, subject_id, subjects(name))")
      .eq("user_id", user.id)
      .eq("status", "submitted"),
    admin
      .from("attempts")
      .select("score_percentage, time_spent_seconds, submitted_at, status")
      .eq("user_id", user.id)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false }),
    admin
      .from("subjects")
      .select("id", { count: "exact", head: true }),
  ])

  const subjectAttempts: SubjectAttempt[] = (subjectAttemptsRaw ?? []).map((r: any) => ({
    exam_set_id: r.exam_set_id as string,
    score_percentage: (r.score_percentage as number | null) ?? null,
    subject_name: normalizeSubjectName(r.exam_sets),
  }))

  const allAttempts: AttemptStat[] = (allAttemptsRaw ?? []).map((r: any) => ({
    score_percentage: (r.score_percentage as number | null) ?? null,
    time_spent_seconds: (r.time_spent_seconds as number | null) ?? null,
    submitted_at: (r.submitted_at as string | null) ?? null,
  }))

  const recentAttempts: RecentAttempt[] = submitted.slice(0, 5).map((a) => {
    const e = a.exam_set as unknown as { title: string } | null
    return {
      id: a.id as string,
      examTitle: e?.title ?? "—",
      score: (a.score_percentage as number) ?? 0,
      submittedAt: (a.submitted_at as string | null) ?? null,
      timeSpentSeconds: (a.time_spent_seconds as number | null) ?? null,
    }
  })

  const fullName = (profile?.full_name as string | null) ?? ""
  const firstName =
    (profile?.first_name as string | null) || fullName.split(" ").at(-1) || "сурагч"
  const role = profile?.role === "admin" || profile?.role === "superadmin" ? "admin" : "student"
  const expPoints = (profile?.exp_points as number | null) ?? 0

  const { data: classMembers } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("user_id", user.id)

  const classIds = ((classMembers ?? []) as { class_id: string }[])
    .map((cm) => cm.class_id)
    .filter(Boolean)

  let initialTimers: ClassTimer[] = []
  if (classIds.length > 0) {
    const now = new Date().toISOString()
    const { data: timerRows } = await supabase
      .from("class_timers")
      .select("id, class_id, label, target_date, classes!class_id(name)")
      .in("class_id", classIds)
      .gt("target_date", now)
      .order("target_date", { ascending: true })

    initialTimers = ((timerRows ?? []) as any[]).map((t) => ({
      id: t.id as string,
      class_id: t.class_id as string,
      class_name:
        (Array.isArray(t.classes) ? t.classes[0]?.name : (t.classes as { name?: string })?.name) ??
        "Анги",
      label: t.label as string,
      target_date: t.target_date as string,
    }))
  }

  return (
    <AppShell
      fullName={fullName}
      email={user.email ?? ""}
      role={role}
      isAdmin={role === "admin"}
      username={(profile?.username as string | null) ?? null}
      avatarUrl={(profile?.avatar_url as string | null) ?? null}
      userId={user.id}
    >
      <DashboardClient
        firstName={firstName}
        expPoints={expPoints}
        subjectAttempts={subjectAttempts}
        allAttempts={allAttempts}
        totalSubjects={totalSubjects ?? 0}
        initialTimers={initialTimers}
        recentAttempts={recentAttempts}
        owned={owned}
        available={availableExams}
        history={history}
        paymentStatus={paymentStatus}
      />
    </AppShell>
  )
}

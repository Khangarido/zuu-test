"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Clock, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { expTier } from "@/lib/ranking-utils"
import { DashboardExamsSection } from "./dashboard-exams"
import type {
  OwnedExamCard,
  AvailableExamCard,
  HistoryExamCard,
} from "@/components/exam-omr-card"

/* ── Types ───────────────────────────────────────────────────────────────── */

export type ClassTimer = {
  id: string
  class_id: string
  class_name: string
  label: string
  target_date: string
}

export type SubjectAttempt = {
  exam_set_id: string
  score_percentage: number | null
  subject_name: string | null
}

export type AttemptStat = {
  score_percentage: number | null
  time_spent_seconds: number | null
  submitted_at: string | null
}

export type RecentAttempt = {
  id: string
  examTitle: string
  score: number
  submittedAt: string | null
  timeSpentSeconds: number | null
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const PIE_COLORS = ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#22C55E", "#94A3B8"]

function mongolianDate() {
  const now = new Date()
  return `${now.getFullYear()} оны ${now.getMonth() + 1}-р сарын ${now.getDate()}`
}

function fmtExp(n: number) {
  return new Intl.NumberFormat("mn-MN").format(n)
}

function fmtDuration(seconds: number | null) {
  if (seconds == null || seconds <= 0) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-rose-600 dark:text-rose-400"
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

type TimeLeft = { days: number; hours: number; mins: number; secs: number; totalMs: number } | null

function getTimeLeft(target: string): TimeLeft {
  const diff = new Date(target).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    totalMs: diff,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  }
}

function prevTierThreshold(exp: number) {
  if (exp < 500) return 0
  if (exp < 1500) return 500
  if (exp < 3000) return 1500
  if (exp < 6000) return 3000
  if (exp < 10000) return 6000
  return 10000
}

/* ── Countdown card ──────────────────────────────────────────────────────── */

function CountdownCard({ timer }: { timer: ClassTimer }) {
  const [left, setLeft] = useState<TimeLeft>(() => getTimeLeft(timer.target_date))

  useEffect(() => {
    const id = setInterval(() => setLeft(getTimeLeft(timer.target_date)), 1000)
    return () => clearInterval(id)
  }, [timer.target_date])

  const isUrgent = left && left.totalMs < 24 * 60 * 60 * 1000
  const isPulse = left && left.totalMs < 60 * 60 * 1000

  return (
    <div className={cn("rounded-xl border bg-card/50 p-3 space-y-1.5", isPulse && "border-rose-400/50")}>
      <span className="text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full px-2 py-0.5">
        {timer.class_name}
      </span>
      <p className="text-sm font-semibold leading-tight">{timer.label}</p>
      {left ? (
        <p
          className={cn(
            "font-mono text-base font-bold tabular-nums",
            isPulse ? "text-rose-500 animate-pulse" : isUrgent ? "text-rose-500" : "text-foreground"
          )}
        >
          {left.days > 0 && `${left.days} өдөр `}
          {String(left.hours).padStart(2, "0")}:{String(left.mins).padStart(2, "0")}:
          {String(left.secs).padStart(2, "0")}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Дууссан</p>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function DashboardClient({
  firstName,
  expPoints,
  subjectAttempts,
  allAttempts,
  totalSubjects,
  initialTimers,
  recentAttempts,
  owned,
  available,
  history,
  paymentStatus,
}: {
  firstName: string
  expPoints: number
  subjectAttempts: SubjectAttempt[]
  allAttempts: AttemptStat[]
  totalSubjects: number
  initialTimers: ClassTimer[]
  recentAttempts: RecentAttempt[]
  owned: OwnedExamCard[]
  available: AvailableExamCard[]
  history: HistoryExamCard[]
  paymentStatus?: "success" | "cancelled" | null
}) {
  const scores = useMemo(
    () => allAttempts.map((a) => a.score_percentage).filter((s): s is number => s != null),
    [allAttempts]
  )

  const totalAttempts = allAttempts.length
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const bestScore = scores.length ? Math.max(...scores) : 0
  const recentScores = scores.slice(0, 5)
  const recentAvgScore = recentScores.length
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    : 0

  const consistencyScore = Math.max(0, Math.min(100, 100 - stdDev(scores)))

  const timesWithData = allAttempts
    .map((a) => a.time_spent_seconds)
    .filter((t): t is number => t != null && t > 0)
  const avgTimeSeconds = timesWithData.length
    ? timesWithData.reduce((a, b) => a + b, 0) / timesWithData.length
    : null
  const speedScore =
    avgTimeSeconds != null
      ? Math.max(0, Math.min(100, 100 - (avgTimeSeconds / 3600) * 100))
      : 50

  const uniqueSubjects = new Set(
    subjectAttempts.map((a) => a.subject_name ?? "Бусад")
  ).size
  const subjectBreadth =
    totalSubjects > 0
      ? Math.min(100, (uniqueSubjects / totalSubjects) * 100)
      : Math.min(100, uniqueSubjects * 20)

  const radarData = useMemo(
    () => [
      { axis: "Оноо", value: Math.round(avgScore) },
      { axis: "Тогтворт", value: Math.round(consistencyScore) },
      { axis: "Хурд", value: Math.round(speedScore) },
      { axis: "Идэвх", value: Math.min(totalAttempts * 5, 100) },
      { axis: "Саяхны", value: Math.round(recentAvgScore) },
      { axis: "Хамрах", value: Math.round(subjectBreadth) },
    ],
    [avgScore, consistencyScore, speedScore, totalAttempts, recentAvgScore, subjectBreadth]
  )

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of subjectAttempts) {
      const name = a.subject_name ?? "Бусад"
      counts[name] = (counts[name] ?? 0) + 1
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 5)
    const rest = sorted.slice(5).reduce((s, [, c]) => s + c, 0)
    const items = top.map(([name, value]) => ({ name, value }))
    if (rest > 0) items.push({ name: "Бусад", value: rest })
    return items
  }, [subjectAttempts])

  const tierInfo = expTier(expPoints)
  const tierPrev = prevTierThreshold(expPoints)
  const tierProgress =
    tierInfo.next === Infinity
      ? 100
      : Math.min(100, ((expPoints - tierPrev) / (tierInfo.next - tierPrev)) * 100)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Сайн байна уу, {firstName}!</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{mongolianDate()}</p>
        </div>
      </div>

      {paymentStatus === "success" && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-5 py-4 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-base">Төлбөр амжилттай!</p>
            <p className="text-sm opacity-80">Шалгалт таны жагсаалтад нэмэгдлээ.</p>
          </div>
        </div>
      )}
      {paymentStatus === "cancelled" && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-5 py-4 text-amber-800 dark:text-amber-300 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-base">Төлбөр цуцлагдлаа</p>
            <p className="text-sm opacity-80">Дахин оролдохдоо “Худалдаж авах” дарна уу.</p>
          </div>
        </div>
      )}

      {/* Section 1 — Hero row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left — User stat summary */}
        <div className="rounded-2xl border bg-card p-5 sm:p-6 flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            <div
              className="size-36 rounded-full flex flex-col items-center justify-center border-4"
              style={{ borderColor: tierInfo.color + "66", backgroundColor: tierInfo.color + "11" }}
            >
              <span className="text-4xl font-extrabold tabular-nums">{totalAttempts}</span>
              <span className="text-xs text-muted-foreground font-medium mt-0.5">Шалгалт</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            <div className="text-center rounded-xl bg-muted/40 p-3">
              <p className="text-lg font-bold">{avgScore > 0 ? `${avgScore.toFixed(0)}%` : "—"}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Дундаж</p>
            </div>
            <div className="text-center rounded-xl bg-muted/40 p-3">
              <p className="text-lg font-bold">{bestScore > 0 ? `${bestScore.toFixed(0)}%` : "—"}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Хамгийн өндөр</p>
            </div>
            <div className="text-center rounded-xl bg-muted/40 p-3">
              <p className="text-lg font-bold flex items-center justify-center gap-0.5">
                <Zap className="size-3.5" style={{ color: tierInfo.color }} />
                {fmtExp(expPoints)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">EXP</p>
            </div>
            <div className="text-center rounded-xl bg-muted/40 p-3">
              <p className="text-sm font-bold leading-tight" style={{ color: tierInfo.color }}>
                {tierInfo.tier}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Түвшин</p>
            </div>
          </div>

          {/* EXP progress */}
          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>EXP явц</span>
              <span>
                {fmtExp(expPoints)}
                {tierInfo.next !== Infinity && ` / ${fmtExp(tierInfo.next)}`}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${tierProgress}%`, backgroundColor: tierInfo.color }}
              />
            </div>
          </div>

          <span
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold"
            style={{ backgroundColor: tierInfo.color + "22", color: tierInfo.color }}
          >
            <Zap className="size-4" />
            {tierInfo.tier}
          </span>
        </div>

        {/* Right — Radar chart */}
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Чадварын радар</h2>
          {totalAttempts === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
              Шалгалт өгсний дараа график харагдана
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                <PolarGrid stroke="hsl(var(--border))" gridType="polygon" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Radar
                  dataKey="value"
                  stroke="#6366F1"
                  fill="url(#radarGradient)"
                  fillOpacity={0.4}
                  dot={{ r: 3, fill: "#6366F1", strokeWidth: 0 }}
                />
                <defs>
                  <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(0)}`, ""]}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Section 2 — Pie + Timers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold mb-3">Хийсэн шалгалтын төрөл</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              Өгөгдөл байхгүй
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} удаа`, name]}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value, entry) => {
                    const count = (entry.payload as { value?: number })?.value ?? 0
                    return `${value} (${count})`
                  }}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Timers */}
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Ирэх арга хэмжээ</h2>
          </div>
          {initialTimers.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              Удахгүй болох арга хэмжээ байхгүй
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {initialTimers.map((t) => (
                <CountdownCard key={t.id} timer={t} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exam OMR cards */}
      <DashboardExamsSection owned={owned} available={available} history={history} />

      {/* Section 3 — Recent attempts table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">Сүүлийн шалгалтууд</h2>
        </div>
        {recentAttempts.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Дууссан шалгалт байхгүй байна
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Шалгалт</th>
                  <th className="px-5 py-2.5 font-medium w-20">Оноо</th>
                  <th className="px-5 py-2.5 font-medium w-28">Огноо</th>
                  <th className="px-5 py-2.5 font-medium w-24">Хугацаа</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentAttempts.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/results/${a.id}`}
                        className="font-medium hover:underline truncate block max-w-[240px] sm:max-w-none"
                      >
                        {a.examTitle}
                      </Link>
                    </td>
                    <td className={cn("px-5 py-3 font-bold tabular-nums", scoreColor(a.score))}>
                      {a.score.toFixed(0)}%
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {a.submittedAt
                        ? new Date(a.submittedAt).toLocaleDateString("mn-MN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs font-mono tabular-nums">
                      {fmtDuration(a.timeSpentSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

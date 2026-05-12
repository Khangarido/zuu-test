"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getTierColor, getTierEmoji } from "@/lib/ranking-utils"
import { cn } from "@/lib/utils"

interface Student {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  grade: string | null
  subjects: string[] | null
  rank_score: number
  rank_tier: string
  attempts: number
}

const GRADE_LABELS: Record<string, string> = {
  graduated: "Төгссөн",
  other: "Бусад",
}

function gradeLabel(g: string | null) {
  if (!g) return null
  return GRADE_LABELS[g] ?? `${g}-р анги`
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

const GRADES_FOR_FILTER = [
  { value: "all", label: "Бүх анги" },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}-р анги` })),
  { value: "graduated", label: "Төгссөн" },
  { value: "other", label: "Бусад" },
]

const SUBJECTS_FOR_FILTER = [
  { value: "all", label: "Бүх хичээл" },
  "Математик", "Монгол хэл", "Англи хэл", "Физик",
  "Хими", "Биологи", "Газарзүй", "Түүх",
  "Нийгэм", "Мэдээлэл зүй",
].map((s) => typeof s === "string" ? { value: s, label: s } : s)

export function LeaderboardClient({
  students,
  currentUserId,
}: {
  students: Student[]
  currentUserId: string
}) {
  const [gradeFilter, setGradeFilter]   = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")

  const filtered = students.filter((s) => {
    if (gradeFilter !== "all" && s.grade !== gradeFilter) return false
    if (subjectFilter !== "all" && !(s.subjects ?? []).includes(subjectFilter)) return false
    return true
  })

  const SELECT_CLS =
    "h-8 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className={SELECT_CLS}>
          {GRADES_FOR_FILTER.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={SELECT_CLS}>
          {SUBJECTS_FOR_FILTER.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground self-center">
          {filtered.length} сурагч
        </span>
      </div>

      {/* Top 3 */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            filtered[1], filtered[0], filtered[2],
          ].map((s, idx) => {
            if (!s) return <div key={idx} />
            const globalRank = students.indexOf(s) + 1
            const podiumRank = [2, 1, 3][idx]
            const podiumColors = [
              "from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800",
              "from-yellow-200 to-amber-300 dark:from-yellow-800 dark:to-amber-900",
              "from-orange-200 to-amber-200 dark:from-orange-900 dark:to-amber-900",
            ]
            const medals = ["🥈", "🥇", "🥉"]
            const isCurrentUser = s.id === currentUserId
            return (
              <Link
                key={s.id}
                href={s.username ? `/profile/${s.username}` : "#"}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl text-center",
                  `bg-gradient-to-b ${podiumColors[idx]}`,
                  isCurrentUser && "ring-2 ring-primary",
                  idx === 1 && "sm:-mt-4"
                )}
              >
                <span className="text-2xl">{medals[idx]}</span>
                <Avatar className="size-12 ring-2 ring-white/30">
                  <AvatarImage src={s.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold">
                    {initials(s.full_name ?? "") || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold truncate max-w-[80px]">
                    {s.full_name?.split(" ")[0] ?? "—"}
                  </p>
                  {s.username && (
                    <p className="text-xs text-muted-foreground">@{s.username}</p>
                  )}
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getTierColor(s.rank_tier)}`}>
                  {getTierEmoji(s.rank_tier)}
                </span>
                <p className="text-sm font-bold">{s.rank_score.toFixed(1)}</p>
              </Link>
            )
          })}
        </div>
      )}

      {/* Rest of list */}
      <div className="space-y-2">
        {filtered.slice(3).map((s, idx) => {
          const globalRank = students.indexOf(s) + 1
          const isCurrentUser = s.id === currentUserId
          return (
            <Card
              key={s.id}
              className={cn(
                "transition-colors",
                isCurrentUser && "ring-2 ring-primary bg-primary/5"
              )}
            >
              <CardContent className="flex items-center gap-3 py-3">
                <span className="text-muted-foreground font-mono text-sm w-6 text-center shrink-0">
                  {globalRank}
                </span>
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={s.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold">
                    {initials(s.full_name ?? "") || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={s.username ? `/profile/${s.username}` : "#"}
                      className="text-sm font-semibold hover:underline truncate"
                    >
                      {s.full_name ?? "—"}
                    </Link>
                    {s.username && (
                      <span className="text-xs text-muted-foreground">@{s.username}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getTierColor(s.rank_tier)}`}>
                      {getTierEmoji(s.rank_tier)} {s.rank_tier}
                    </span>
                    {s.grade && (
                      <span className="text-xs text-muted-foreground">{gradeLabel(s.grade)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{s.rank_score.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{s.attempts} оролдлого</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          Тохирох сурагч олдсонгүй
        </p>
      )}
    </div>
  )
}

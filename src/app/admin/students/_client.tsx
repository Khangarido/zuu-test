"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getTierColor, getTierEmoji } from "@/lib/ranking-utils"
import { Download, Search } from "lucide-react"

interface Student {
  id: string
  full_name: string | null
  username:  string | null
  avatar_url: string | null
  grade:     string | null
  subjects:  string[] | null
  rank_score: number
  rank_tier:  string
  created_at: string
  attempts:   number
  avg_score:  number | null
}

const GRADE_LABELS: Record<string, string> = { graduated: "Төгссөн", other: "Бусад" }
const gradeLabel = (g: string | null) => g ? (GRADE_LABELS[g] ?? `${g}-р анги`) : "—"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

const SELECT_CLS =
  "h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const GRADES = [
  { value: "all", label: "Бүх анги" },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}-р анги` })),
  { value: "graduated", label: "Төгссөн" },
  { value: "other", label: "Бусад" },
]

const SUBJECTS = [
  { value: "all", label: "Бүх хичээл" },
  "Математик", "Монгол хэл", "Англи хэл", "Физик",
  "Хими", "Биологи", "Газарзүй", "Түүх", "Нийгэм", "Мэдээлэл зүй",
].map((s) => typeof s === "string" ? { value: s, label: s } : s)

const SCORE_RANGES = [
  { value: "all",  label: "Бүх оноо" },
  { value: "0-40", label: "0–40%" },
  { value: "40-70", label: "40–70%" },
  { value: "70-100", label: "70–100%" },
]

function exportCsv(students: Student[]) {
  const header = [
    "Нэр", "Username", "Анги", "Хичээлүүд",
    "Оролдлогын тоо", "Дундаж оноо", "Rank оноо", "Tier", "Бүртгэгдсэн",
  ].join(",")

  const rows = students.map((s) =>
    [
      `"${s.full_name ?? ""}"`,
      s.username ?? "",
      gradeLabel(s.grade),
      `"${(s.subjects ?? []).join("; ")}"`,
      s.attempts,
      s.avg_score != null ? s.avg_score.toFixed(1) : "",
      s.rank_score.toFixed(1),
      s.rank_tier,
      new Date(s.created_at).toLocaleDateString("mn-MN"),
    ].join(",")
  )

  const blob = new Blob([[header, ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href     = url
  link.download = `students_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function StudentsClient({ students }: { students: Student[] }) {
  const [search,      setSearch]      = useState("")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [scoreFilter, setScoreFilter] = useState("all")

  const filtered = students.filter((s) => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !s.full_name?.toLowerCase().includes(q) &&
        !s.username?.toLowerCase().includes(q)
      ) return false
    }
    if (gradeFilter !== "all" && s.grade !== gradeFilter) return false
    if (subjectFilter !== "all" && !(s.subjects ?? []).includes(subjectFilter)) return false
    if (scoreFilter !== "all" && s.avg_score != null) {
      const [lo, hi] = scoreFilter.split("-").map(Number)
      if (s.avg_score < lo || s.avg_score > hi) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 w-48 text-sm"
            placeholder="Хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={gradeFilter}   onChange={(e) => setGradeFilter(e.target.value)}   className={SELECT_CLS}>
          {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={SELECT_CLS}>
          {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={scoreFilter}   onChange={(e) => setScoreFilter(e.target.value)}   className={SELECT_CLS}>
          {SCORE_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">{filtered.length} сурагч</span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => exportCsv(filtered)}
        >
          <Download className="size-4 mr-1" />
          CSV экспорт
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сурагч</TableHead>
              <TableHead>Анги</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Rank</TableHead>
              <TableHead className="text-right">Оролдлого</TableHead>
              <TableHead className="text-right">Дундаж</TableHead>
              <TableHead>Бүртгэгдсэн</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Тохирох сурагч олдсонгүй
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8 shrink-0">
                        <AvatarImage src={s.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold">
                          {initials(s.full_name ?? "") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{s.full_name ?? "—"}</p>
                        {s.username && (
                          <p className="text-xs text-muted-foreground">@{s.username}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{gradeLabel(s.grade)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getTierColor(s.rank_tier)}`}>
                      {getTierEmoji(s.rank_tier)} {s.rank_tier}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {s.rank_score.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right text-sm">{s.attempts}</TableCell>
                  <TableCell className="text-right text-sm">
                    {s.avg_score != null ? `${s.avg_score.toFixed(0)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("mn-MN")}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/students/${s.id}`}>Дэлгэрэнгүй</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

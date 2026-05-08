"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export type StudentResult = {
  attempt_id: string; user_id: string
  full_name: string | null; username: string | null; avatar_url: string | null; rank_tier: string | null
  score_percentage: number; correct_count: number; total_count: number
  started_at: string | null; submitted_at: string | null
}

function tierColor(tier: string | null) {
  switch (tier) {
    case "Diamond": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300"
    case "Platinum": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
    case "Gold":    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
    case "Silver":  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    default:        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
  }
}

function scoreColor(s: number) {
  if (s >= 70) return "text-emerald-600 dark:text-emerald-400"
  if (s >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function timeTaken(started: string | null, submitted: string | null) {
  if (!started || !submitted) return "\u2014"
  const ms = new Date(submitted).getTime() - new Date(started).getTime()
  if (ms <= 0) return "\u2014"
  return `${Math.floor(ms / 60000)}\u043c ${Math.floor((ms % 60000) / 1000)}\u0441`
}

function formatDate(iso: string | null) {
  if (!iso) return "\u2014"
  return new Date(iso).toLocaleDateString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function initials(name: string | null, username: string | null) {
  if (name) return name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
  if (username) return username.slice(0, 2).toUpperCase()
  return "??"
}

export function ResultsTable({ students, examTitle }: { students: StudentResult[]; examTitle: string }) {
  const [sort, setSort] = useState<"score" | "date">("score")

  const sorted = [...students].sort((a, b) =>
    sort === "score"
      ? b.score_percentage - a.score_percentage
      : new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime()
  )

  const passCount = students.filter((s) => s.score_percentage >= 70).length
  const passRate  = students.length ? (passCount / students.length) * 100 : 0
  const avgScore  = students.length ? students.reduce((s, r) => s + r.score_percentage, 0) / students.length : 0

  function handleExport() {
    const headers = ["\u041d\u044d\u0440", "@\u0445\u044d\u0440\u044d\u0433\u043b\u044d\u0433\u0447\u0438\u0439\u043d \u043d\u044d\u0440", "\u041e\u043d\u043e\u043e %", "\u0417\u04e9\u0432/\u041d\u0438\u0439\u0442", "\u0425\u0443\u0433\u0430\u0446\u0430\u0430", "\u041e\u0433\u043d\u043e\u043e", "Tier"]
    const rows = sorted.map((s) => [
      s.full_name ?? "", s.username ? `@${s.username}` : "",
      s.score_percentage.toFixed(1), `${s.correct_count}/${s.total_count}`,
      timeTaken(s.started_at, s.submitted_at), formatDate(s.submitted_at), s.rank_tier ?? "Bronze"
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${examTitle}_results.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span><span className="font-semibold text-foreground">{students.length}</span> \u043e\u0440\u043e\u043b\u0446\u043e\u0433\u0447</span>
        <span>\u0414\u0443\u043d\u0434\u0430\u0436: <span className={cn("font-semibold", scoreColor(avgScore))}>{avgScore.toFixed(1)}%</span></span>
        <span>\u0422\u044d\u043d\u0446\u0441\u044d\u043d (\u226570%): <span className="font-semibold text-emerald-600 dark:text-emerald-400">{passCount} ({passRate.toFixed(0)}%)</span></span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button size="sm" variant={sort === "score" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSort("score")}>\u041e\u043d\u043e\u043e\u0433\u043e\u043e\u0440</Button>
          <Button size="sm" variant={sort === "date" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSort("date")}>\u041e\u0433\u043d\u043e\u043e\u0433\u043e\u043e\u0440</Button>
        </div>
        <Button size="sm" variant="outline" className="cursor-pointer gap-1.5" onClick={handleExport}>
          <Download className="size-3.5" />CSV \u044d\u043a\u0441\u043f\u043e\u0440\u0442
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium w-8">#</th>
              <th className="px-4 py-3 text-left font-medium">\u0421\u0443\u0440\u0430\u0433\u0447</th>
              <th className="px-4 py-3 text-center font-medium">\u041e\u043d\u043e\u043e</th>
              <th className="px-4 py-3 text-center font-medium">\u0417\u04e9\u0432/\u041d\u0438\u0439\u0442</th>
              <th className="px-4 py-3 text-center font-medium">\u0425\u0443\u0433\u0430\u0446\u0430\u0430</th>
              <th className="px-4 py-3 text-center font-medium">\u041e\u0433\u043d\u043e\u043e</th>
              <th className="px-4 py-3 text-center font-medium">Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sorted.map((s, i) => (
              <tr key={s.attempt_id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8">
                      <AvatarImage src={s.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(s.full_name, s.username)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-tight">{s.full_name ?? s.username ?? "\u041d\u044d\u0440\u0433\u04af\u0439"}</p>
                      {s.username && <p className="text-xs text-muted-foreground">@{s.username}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn("font-bold tabular-nums text-base", scoreColor(s.score_percentage))}>{s.score_percentage.toFixed(1)}%</span>
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{s.correct_count}/{s.total_count}</td>
                <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{timeTaken(s.started_at, s.submitted_at)}</td>
                <td className="px-4 py-3 text-center text-muted-foreground text-xs">{formatDate(s.submitted_at)}</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={cn("text-xs font-medium border-0", tierColor(s.rank_tier))}>{s.rank_tier ?? "Bronze"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <div className="py-12 text-center text-muted-foreground text-sm">\u042d\u043d\u044d \u0448\u0430\u043b\u0433\u0430\u043b\u0442\u0430\u043d\u0434 \u043e\u0440\u043e\u043b\u0446\u043e\u0433\u0447 \u0431\u0430\u0439\u0445\u0433\u04af\u0439 \u0431\u0430\u0439\u043d\u0430.</div>}
      </div>
    </div>
  )
}

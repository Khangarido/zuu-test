"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RefreshCw, UserCheck, Search, RotateCcw, Download, Loader2 } from "lucide-react"
import {
  setRoleByEmail, findUserByUsername, recalculateAllRanks, exportAllStudentsCsv,
} from "./_actions"

/* ── Types ──────────────────────────────────────────────────────────────── */
type ActivityPoint = { date: string; count: number }
type SubjectPoint  = { subject: string; count: number; pct: number }

/* ── Tier badge ─────────────────────────────────────────────────────────── */
const TIER_COLORS: Record<string, string> = {
  Bronze:   "bg-orange-900/40 text-orange-300 border-orange-700",
  Silver:   "bg-slate-700/40 text-slate-300 border-slate-500",
  Gold:     "bg-yellow-900/40 text-yellow-300 border-yellow-600",
  Platinum: "bg-cyan-900/40 text-cyan-300 border-cyan-600",
  Diamond:  "bg-violet-900/40 text-violet-300 border-violet-600",
}
export function TierBadge({ tier }: { tier: string }) {
  const cls = TIER_COLORS[tier] ?? TIER_COLORS.Bronze
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${cls}`}>{tier}</span>
}

/* ── Refresh button ─────────────────────────────────────────────────────── */
export function RefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <Button variant="outline" size="sm" disabled={pending}
      onClick={() => startTransition(() => { router.refresh() })}>
      {pending ? <Loader2 className="size-4 animate-spin mr-1" /> : <RefreshCw className="size-4 mr-1" />}
      Шинэчлэх
    </Button>
  )
}

/* ── Exam Activity Chart ────────────────────────────────────────────────── */
export function ExamActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#1e1e2e", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#aaa", fontSize: 12 }}
          itemStyle={{ color: "#818cf8" }}
          cursor={{ fill: "rgba(129,140,248,0.08)" }}
        />
        <Bar dataKey="count" name="Шалгалт" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill="#6366f1" />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Subject Popularity ─────────────────────────────────────────────────── */
export function SubjectPopularity({ data }: { data: SubjectPoint[] }) {
  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((s) => (
        <div key={s.subject} className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{s.subject}</span>
            <span>{s.count} сурагч ({s.pct}%)</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${s.pct}%` }} />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-muted-foreground">Мэдээлэл байхгүй</p>}
    </div>
  )
}

/* ── Quick Actions Panel ────────────────────────────────────────────────── */
export function QuickActionsPanel() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [isPending, startTransition] = useTransition()

  const handlePromote = () => {
    if (!email.trim()) return
    startTransition(async () => {
      try {
        await setRoleByEmail(email.trim(), "admin")
        toast.success(`${email} -г админ болголоо`)
        setEmail("")
      } catch (e) { toast.error(e instanceof Error ? e.message : "Алдаа гарлаа") }
    })
  }

  const handleSearch = () => {
    if (!username.trim()) return
    startTransition(async () => {
      try {
        const user = await findUserByUsername(username.replace("@", "").trim())
        if (user) window.location.href = `/admin/students/${user.id}`
        else toast.error("Тийм username-тэй хэрэглэгч олдсонгүй")
      } catch (e) { toast.error(e instanceof Error ? e.message : "Алдаа гарлаа") }
    })
  }

  const handleRecalc = () => {
    startTransition(async () => {
      try {
        const { updated } = await recalculateAllRanks()
        toast.success(`${updated} сурагчийн rank шинэчлэгдлээ`)
      } catch (e) { toast.error(e instanceof Error ? e.message : "Алдаа гарлаа") }
    })
  }

  const handleExport = () => {
    startTransition(async () => {
      try {
        const csv = await exportAllStudentsCsv()
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url; a.download = "students.csv"; a.click()
        URL.revokeObjectURL(url)
        toast.success("CSV татагдлаа")
      } catch (e) { toast.error(e instanceof Error ? e.message : "Алдаа гарлаа") }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Шинэ admin нэмэх</p>
        <div className="flex gap-2">
          <Input placeholder="Имэйл хаяг" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePromote()} className="text-sm h-8" />
          <Button size="sm" onClick={handlePromote} disabled={isPending || !email.trim()} className="h-8 shrink-0">
            <UserCheck className="size-3.5 mr-1" /> Болгох
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Хэрэглэгч хайх</p>
        <div className="flex gap-2">
          <Input placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="text-sm h-8" />
          <Button size="sm" variant="outline" onClick={handleSearch} disabled={isPending || !username.trim()} className="h-8 shrink-0">
            <Search className="size-3.5 mr-1" /> Хайх
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={handleRecalc} disabled={isPending} className="h-9 text-xs">
          {isPending ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <RotateCcw className="size-3.5 mr-1" />}
          Бүх rank шинэчлэх
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending} className="h-9 text-xs">
          <Download className="size-3.5 mr-1" /> CSV татах
        </Button>
      </div>
    </div>
  )
}

/* ── Recent Signups Table ───────────────────────────────────────────────── */
type Signup = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  grade: string | null
  subjects: string[] | null
  rank_tier: string
  created_at: string
}

export function RecentSignupsTable({
  students,
  onPromote,
}: {
  students: Signup[]
  onPromote: (id: string) => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  const [promotingId, setPromotingId] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Хэрэглэгч</th>
            <th className="text-left py-2 pr-4 font-medium">Анги</th>
            <th className="text-left py-2 pr-4 font-medium">Tier</th>
            <th className="text-left py-2 pr-4 font-medium">Бүртгэгдсэн</th>
            <th className="text-left py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={s.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs bg-indigo-500/20 text-indigo-300">
                      {s.full_name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={`/admin/students/${s.id}`} className="font-medium hover:underline">
                      {s.full_name ?? "—"}
                    </Link>
                    {s.username && <div className="text-xs text-muted-foreground">@{s.username}</div>}
                  </div>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground">{s.grade ? `${s.grade}-р анги` : "—"}</td>
              <td className="py-2.5 pr-4"><TierBadge tier={s.rank_tier} /></td>
              <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                {timeAgo(s.created_at)}
              </td>
              <td className="py-2.5">
                <Button size="sm" variant="ghost"
                  className="h-7 text-xs text-indigo-400 hover:text-indigo-300"
                  disabled={pending && promotingId === s.id}
                  onClick={() => {
                    setPromotingId(s.id)
                    startTransition(async () => {
                      try { await onPromote(s.id); toast.success("Админ болголоо") }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Алдаа") }
                      finally { setPromotingId(null) }
                    })
                  }}>
                  {pending && promotingId === s.id ? <Loader2 className="size-3 animate-spin" /> : "Админ болгох"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {students.length === 0 && <p className="text-sm text-muted-foreground py-4">Сурагч байхгүй</p>}
    </div>
  )
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} минутын өмнө`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} цагийн өмнө`
  const days = Math.floor(hrs / 24)
  return `${days} өдрийн өмнө`
}

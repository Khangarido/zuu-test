"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getTierColor, getTierEmoji, expTier } from "@/lib/ranking-utils"
import { cn } from "@/lib/utils"
import { Zap, User } from "lucide-react"
import type { RankRow } from "@/lib/leaderboard"

const GRADE_LABELS: Record<string, string> = { graduated: "Төгссөн", other: "Бусад" }
function gradeLabel(g: string | null | undefined) {
  if (!g) return null
  return GRADE_LABELS[g] ?? `${g}-р анги`
}
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}
function fmt(n: number) {
  return new Intl.NumberFormat("mn-MN").format(n)
}

const GRADES_FOR_FILTER = [
  { value: "all", label: "Бүх анги" },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}-р анги` })),
  { value: "graduated", label: "Төгссөн" },
  { value: "other", label: "Бусад" },
]
const SUBJECTS_FOR_FILTER = [
  { value: "all", label: "Бүх хичээл" },
  ...["Математик", "Монгол хэл", "Англи хэл", "Физик", "Хими", "Биологи", "Газарзүй", "Түүх", "Нийгэм", "Мэдээлэл зүй"].map((s) => ({ value: s, label: s })),
]
const SELECT_CLS =
  "h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const PODIUM_COLORS = [
  "from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800",
  "from-yellow-200 to-amber-300 dark:from-yellow-800 dark:to-amber-900",
  "from-orange-200 to-amber-200 dark:from-orange-900 dark:to-amber-900",
]
const MEDALS = ["🥈", "🥇", "🥉"]

type Kind = "score" | "exp"

/** Display name: real name only for the viewer's own row (or any row for admins). */
function labelOf(row: RankRow) {
  return row.identity?.name ?? `Сурагч #${row.rank}`
}

function TierBadge({ row, kind }: { row: RankRow; kind: Kind }) {
  if (kind === "exp") {
    const t = expTier(row.value)
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: t.color + "22", color: t.color }}>
        <Zap className="size-2.5" />{t.tier}
      </span>
    )
  }
  if (!row.tier) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getTierColor(row.tier)}`}>
      {getTierEmoji(row.tier)} {row.tier}
    </span>
  )
}

function RowAvatar({ row, className }: { row: RankRow; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarImage src={row.identity?.avatar_url ?? undefined} />
      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold">
        {row.identity?.name ? initials(row.identity.name) || "?" : <User className="size-4" />}
      </AvatarFallback>
    </Avatar>
  )
}

/** Links to a profile only for the viewer's own row or for admins. */
function NameLink({ row, className }: { row: RankRow; className?: string }) {
  const text = (
    <>
      {labelOf(row)}
      {row.me && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground align-middle">Та</span>}
    </>
  )
  return row.identity?.username ? (
    <Link href={`/profile/${row.identity.username}`} className={cn("hover:underline", className)}>{text}</Link>
  ) : (
    <span className={className}>{text}</span>
  )
}

function Podium({ rows, kind }: { rows: RankRow[]; kind: Kind }) {
  if (rows.length === 0) return null
  const order = [rows[1], rows[0], rows[2]]
  return (
    <div className="grid grid-cols-3 gap-3">
      {order.map((row, idx) => {
        if (!row) return <div key={idx} />
        return (
          <div
            key={row.rank}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl text-center bg-gradient-to-b",
              PODIUM_COLORS[idx],
              row.me && "ring-2 ring-primary",
              idx === 1 && "sm:-mt-4"
            )}
          >
            <span className="text-2xl" aria-hidden>{MEDALS[idx]}</span>
            <RowAvatar row={row} className="size-12 ring-2 ring-white/30" />
            <NameLink row={row} className="text-xs font-semibold max-w-[96px] truncate" />
            <TierBadge row={row} kind={kind} />
            <p className="text-sm font-bold tabular-nums">{kind === "exp" ? `${fmt(row.value)} XP` : row.value.toFixed(1)}</p>
          </div>
        )
      })}
    </div>
  )
}

function RankCard({ row, kind, note }: { row: RankRow; kind: Kind; note?: string }) {
  return (
    <Card className={cn("transition-colors", row.me && "ring-2 ring-primary bg-primary/5")}>
      <CardContent className="flex items-center gap-3 py-3">
        <span className="text-muted-foreground font-mono text-sm w-7 text-center shrink-0 tabular-nums">{row.rank}</span>
        <RowAvatar row={row} className="size-9 shrink-0" />
        <div className="flex-1 min-w-0">
          <NameLink row={row} className="text-sm font-semibold truncate block" />
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <TierBadge row={row} kind={kind} />
            {row.identity?.grade && <span className="text-xs text-muted-foreground">{gradeLabel(row.identity.grade)}</span>}
            {note && <span className="text-xs text-muted-foreground">{note}</span>}
          </div>
        </div>
        <p className="text-sm font-bold shrink-0 tabular-nums">
          {kind === "exp" ? <span className="inline-flex items-center gap-1"><Zap className="size-3 text-amber-500" />{fmt(row.value)}</span> : row.value.toFixed(1)}
        </p>
      </CardContent>
    </Card>
  )
}

function RankList({ rows, me, kind, topN }: { rows: RankRow[]; me: RankRow | null; kind: Kind; topN: number }) {
  if (rows.length === 0 && !me) {
    return <p className="text-center text-sm text-muted-foreground py-10">Тохирох сурагч олдсонгүй</p>
  }
  return (
    <div className="space-y-4">
      {me && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Таны байр</p>
          <RankCard row={me} kind={kind} note={`Шилдэг ${topN}-д ороогүй`} />
        </div>
      )}
      <Podium rows={rows.slice(0, 3)} kind={kind} />
      <div className="space-y-2">
        {rows.slice(3).map((row) => <RankCard key={row.rank} row={row} kind={kind} />)}
      </div>
    </div>
  )
}

export function LeaderboardClient({
  scoreRows, scoreTotal, scoreMe, expRows, expMe, isAdmin, filters,
}: {
  scoreRows: RankRow[]
  scoreTotal: number
  scoreMe: RankRow | null
  expRows: RankRow[]
  expMe: RankRow | null
  isAdmin: boolean
  filters: { grade: string; subject: string }
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const go = (next: { grade?: string; subject?: string }) => {
    const grade = next.grade ?? filters.grade
    const subject = next.subject ?? filters.subject
    const qs = new URLSearchParams()
    if (grade !== "all") qs.set("grade", grade)
    if (subject !== "all") qs.set("subject", subject)
    start(() => router.push(`/leaderboard${qs.size ? `?${qs}` : ""}`))
  }

  return (
    <Tabs defaultValue="score">
      <TabsList className="mb-4">
        <TabsTrigger value="score" className="gap-1.5">🏆 Оноогоор</TabsTrigger>
        <TabsTrigger value="exp" className="gap-1.5"><Zap className="size-3.5 text-amber-500" />EXP-ээр</TabsTrigger>
      </TabsList>

      <TabsContent value="score" className="space-y-4">
        <div className={cn("flex flex-wrap gap-2 items-center", pending && "opacity-60")}>
          <select aria-label="Анги" value={filters.grade} onChange={(e) => go({ grade: e.target.value })} className={SELECT_CLS}>
            {GRADES_FOR_FILTER.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <select aria-label="Хичээл" value={filters.subject} onChange={(e) => go({ subject: e.target.value })} className={SELECT_CLS}>
            {SUBJECTS_FOR_FILTER.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <span className="text-sm text-muted-foreground">{scoreTotal} сурагч</span>
        </div>
        <RankList rows={scoreRows} me={scoreMe} kind="score" topN={100} />
      </TabsContent>

      <TabsContent value="exp">
        <RankList rows={expRows} me={expMe} kind="exp" topN={50} />
      </TabsContent>
      {isAdmin && <p className="mt-4 text-xs text-muted-foreground">Админ харагдац: нэрс харагдаж байна.</p>}
    </Tabs>
  )
}

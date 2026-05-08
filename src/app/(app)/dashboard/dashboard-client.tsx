"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Clock, ShoppingCart, BookOpen, Trophy, ArrowRight, Play, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type OwnedExam = {
  id: string; title: string; description: string | null
  duration_minutes: number; lastAttemptId: string | null; lastScore: number | null
}
export type AvailableExam = {
  id: string; title: string; description: string | null
  duration_minutes: number; price: number
}
export type SubmittedAttempt = {
  id: string; examId: string; examTitle: string; score: number; submittedAt: string | null
}

function formatMnt(n: number) { return new Intl.NumberFormat("mn-MN").format(n) + "\u20ae" }

function ScoreBadge({ score }: { score: number }) {
  const c = score >= 70
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : score >= 40
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}`}>{score.toFixed(0)}%</span>
}

type Tab = "owned" | "available" | "history"

export function DashboardClient({ owned, available, history }: {
  owned: OwnedExam[]; available: AvailableExam[]; history: SubmittedAttempt[]
}) {
  const [tab, setTab] = useState<Tab>("owned")
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()

  const fo = useMemo(() => q ? owned.filter(e => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q)) : owned, [owned, q])
  const fa = useMemo(() => q ? available.filter(e => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q)) : available, [available, q])
  const fh = useMemo(() => q ? history.filter(a => a.examTitle.toLowerCase().includes(q)) : history, [history, q])

  const tabs = [
    { id: "owned" as Tab,     label: "\u041c\u0438\u043d\u0438\u0439 \u0448\u0430\u043b\u0433\u0430\u043b\u0442",   count: fo.length },
    { id: "available" as Tab, label: "\u041d\u044d\u044d\u043b\u0442\u0442\u044d\u0439",                                 count: fa.length },
    { id: "history" as Tab,   label: "\u04e8\u0433\u0441\u04e9\u043d",                                                      count: fh.length },
  ]

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="\u0428\u0430\u043b\u0433\u0430\u043b\u0442 \u0445\u0430\u0439\u0445..."
          className="pl-9 pr-9 h-10 bg-background" />
        {query && (
          <button onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        )}
      </div>

      {q && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{fo.length + fa.length + fh.length}</span> \u04af\u0440 \u0434\u04af\u043d</p>}

      <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all cursor-pointer",
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
            <span className={cn("inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs tabular-nums min-w-[1.25rem]",
              tab === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "owned" && (
        fo.length === 0
          ? <Card className="border-dashed"><CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <BookOpen className="size-10 text-muted-foreground/50" />
              <p className="text-sm">{q ? "\u0425\u0430\u0439\u043b\u0442\u0430\u0434 \u0442\u043e\u0445\u0438\u0440\u043e\u0445 \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u043e\u043b\u0434\u0441\u043e\u043d\u0433\u04af\u0439." : "\u0422\u0430\u043d\u0434 \u043e\u0434\u043e\u043e\u0433\u043e\u043e\u0440 \u0445\u0443\u0434\u0430\u043b\u0434\u0430\u0436 \u0430\u0432\u0441\u0430\u043d \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u0430\u043b\u0433\u0430."}</p>
            </CardContent></Card>
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fo.map(e => (
                <Card key={e.id} className="group hover:shadow-md transition-shadow border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{e.title}</CardTitle>
                      {e.lastScore !== null && <ScoreBadge score={e.lastScore} />}
                    </div>
                    {e.description && <CardDescription className="line-clamp-2 text-xs">{e.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-3.5" /><span>{e.duration_minutes} \u043c\u0438\u043d\u0443\u0442</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {e.lastAttemptId
                      ? <div className="flex w-full gap-2">
                          <Button variant="outline" size="sm" className="flex-1 cursor-pointer" asChild>
                            <Link href={`/results/${e.lastAttemptId}`}>\u04ae\u0440 \u0434\u04af\u043d \u0445\u0430\u0440\u0430\u0445</Link>
                          </Button>
                          <Button size="sm" className="cursor-pointer" asChild>
                            <Link href={`/exam/${e.id}?retake=1`}><Play className="size-3.5" /></Link>
                          </Button>
                        </div>
                      : <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white cursor-pointer" asChild>
                          <Link href={`/exam/${e.id}`}>\u042d\u0445\u043b\u04af\u04af\u043b\u044d\u0445<ArrowRight className="size-4" /></Link>
                        </Button>}
                  </CardFooter>
                </Card>
              ))}
            </div>
      )}

      {tab === "available" && (
        fa.length === 0
          ? <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">
              {q ? "\u0425\u0430\u0439\u043b\u0442\u0430\u0434 \u0442\u043e\u0445\u0438\u0440\u043e\u0445 \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u043e\u043b\u0434\u0441\u043e\u043d\u0433\u04af\u0439." : "\u0428\u0438\u043d\u044d \u0448\u0430\u043b\u0433\u0430\u043b\u0442\u0443\u0443\u0434 \u0443\u0434\u0430\u0445\u0433\u04af\u0439 \u0433\u0430\u0440\u043d\u0430."}
            </CardContent></Card>
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fa.map(e => (
                <Card key={e.id} className="group hover:shadow-md transition-shadow border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{e.title}</CardTitle>
                      {e.price === 0
                        ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 shrink-0 text-xs">\u04ae\u043d\u044d\u0433\u04af\u0439</Badge>
                        : <Badge variant="outline" className="shrink-0 text-xs font-semibold">{formatMnt(e.price)}</Badge>}
                    </div>
                    {e.description && <CardDescription className="line-clamp-2 text-xs">{e.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-3.5" /><span>{e.duration_minutes} \u043c\u0438\u043d\u0443\u0442</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {e.price === 0
                      ? <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white cursor-pointer" asChild>
                          <Link href={`/exam/${e.id}`}>\u042d\u0445\u043b\u04af\u04af\u043b\u044d\u0445<ArrowRight className="size-4" /></Link>
                        </Button>
                      : <Button variant="outline" className="w-full cursor-not-allowed opacity-60" disabled>
                          <ShoppingCart className="size-4" />\u0423\u0434\u0430\u0445\u0433\u04af\u0439 \u043d\u044d\u044d\u043b\u0442\u0442\u044d\u0439 \u0431\u043e\u043b\u043d\u043e
                        </Button>}
                  </CardFooter>
                </Card>
              ))}
            </div>
      )}

      {tab === "history" && (
        fh.length === 0
          ? <Card className="border-dashed"><CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <Trophy className="size-10 text-muted-foreground/50" />
              <p className="text-sm">{q ? "\u0425\u0430\u0439\u043b\u0442\u0430\u0434 \u0442\u043e\u0445\u0438\u0440\u043e\u0445 \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u043e\u043b\u0434\u0441\u043e\u043d\u0433\u04af\u0439." : "\u0414\u04af\u04af\u0440\u0433\u044d\u0441\u044d\u043d \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u0431\u0430\u0439\u0445\u0433\u04af\u0439 \u0431\u0430\u0439\u043d\u0430."}</p>
            </CardContent></Card>
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fh.map(a => (
                <Card key={a.id} className="hover:shadow-md transition-shadow border-border/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{a.examTitle}</CardTitle>
                      <ScoreBadge score={a.score} />
                    </div>
                    <CardDescription className="text-xs">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" }) : "\u2014"}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="outline" className="w-full cursor-pointer" size="sm" asChild>
                      <Link href={`/results/${a.id}`}>\u0414\u044d\u043b\u0433\u044d\u0440\u044d\u043d\u0433\u04af\u0439 \u0445\u0430\u0440\u0430\u0445<ArrowRight className="size-4" /></Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
      )}
    </div>
  )
}

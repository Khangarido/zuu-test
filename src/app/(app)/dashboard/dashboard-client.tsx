"use client"

import { useState, useMemo, type ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Clock, ShoppingCart, BookOpen, Trophy, ArrowRight, Play, Search, X, Loader2, Sparkles, Star } from "lucide-react"
import { cn } from "@/lib/utils"

export type OwnedExam = {
  id: string; title: string; description: string | null
  duration_minutes: number; lastAttemptId: string | null; lastScore: number | null
}
export type AvailableExam = {
  id: string; title: string; description: string | null
  duration_minutes: number; price: number
  is_new: boolean; is_recommended: boolean
}
export type SubmittedAttempt = {
  id: string; examId: string; examTitle: string; score: number; submittedAt: string | null
}

function formatMnt(n: number) { return new Intl.NumberFormat("mn-MN").format(n) + "₮" }

function ScoreBadge({ score }: { score: number }) {
  const c = score >= 70
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : score >= 40
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}`}>{score.toFixed(0)}%</span>
}

type Tab = "owned" | "available" | "history"

function CheckoutOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 text-center px-6">
        <div className="relative size-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 opacity-20 animate-ping" />
          <div className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <ShoppingCart className="size-7 text-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-lg font-semibold">Нэхэмжлэл үүсгэж байна...</p>
          <p className="text-sm text-muted-foreground">Төлбөрийн хуудас руу шилжиж байна, хүлээнэ үү</p>
        </div>
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="size-2 rounded-full bg-indigo-500"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  )
}

function BuyButton({ examId }: { examId: string }) {
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/byl/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examSetId: examId }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        setError(json.error ?? "Алдаа гарлаа. Дахин оролдоно уу.")
        setLoading(false)
        return
      }
      setRedirecting(true)
      window.location.href = json.url
    } catch {
      setError("Сүлжээний алдаа гарлаа. Дахин оролдоно уу.")
      setLoading(false)
    }
  }

  return (
    <>
      {redirecting && <CheckoutOverlay />}
      <div className="w-full space-y-1.5">
        <Button
          onClick={handleBuy}
          disabled={loading || redirecting}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white cursor-pointer"
        >
          {loading || redirecting
            ? <><Loader2 className="size-4 animate-spin" />{redirecting ? "Шилжиж байна..." : "Нэхэмжлэл үүсгэж байна..."}</>
            : <><ShoppingCart className="size-4" />Худалдаж авах</>}
        </Button>
        {error && <p className="text-xs text-red-600 dark:text-red-400 text-center">{error}</p>}
      </div>
    </>
  )
}

function FeaturedCard({ exam }: { exam: AvailableExam }) {
  return (
    <Card className="shrink-0 w-60 hover:shadow-md transition-shadow border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm leading-snug line-clamp-2">{exam.title}</CardTitle>
        <div className="flex items-center justify-between mt-1.5 gap-2">
          {exam.price === 0
            ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">Үнэгүй</Badge>
            : <Badge variant="outline" className="text-xs font-semibold">{formatMnt(exam.price)}</Badge>}
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <Clock className="size-3" />{exam.duration_minutes}м
          </span>
        </div>
      </CardHeader>
      <CardFooter className="pt-0 pb-4 px-4">
        {exam.price === 0
          ? <Button size="sm" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white cursor-pointer" asChild>
              <Link href={`/exam/${exam.id}`}>Эхлүүлэх<ArrowRight className="size-3.5" /></Link>
            </Button>
          : <BuyButton examId={exam.id} />}
      </CardFooter>
    </Card>
  )
}

function FeaturedSection({ icon, title, exams, emptyText }: {
  icon: ReactNode; title: string; exams: AvailableExam[]; emptyText: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {exams.length > 0 && (
          <span className="text-xs text-muted-foreground">({exams.length})</span>
        )}
      </div>
      {exams.length === 0
        ? <p className="text-sm text-muted-foreground">{emptyText}</p>
        : <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {exams.map(e => <FeaturedCard key={e.id} exam={e} />)}
          </div>
      }
    </div>
  )
}

export function DashboardClient({ owned, available, history, paymentStatus }: {
  owned: OwnedExam[]; available: AvailableExam[]; history: SubmittedAttempt[]
  paymentStatus?: "success" | "cancelled" | null
}) {
  const [tab, setTab] = useState<Tab>("owned")
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()

  const fo = useMemo(() => q ? owned.filter(e => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q)) : owned, [owned, q])
  const fa = useMemo(() => q ? available.filter(e => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q)) : available, [available, q])
  const fh = useMemo(() => q ? history.filter(a => a.examTitle.toLowerCase().includes(q)) : history, [history, q])

  const tabs = [
    { id: "owned" as Tab,     label: "Миний шалгалт",   count: fo.length },
    { id: "available" as Tab, label: "Нээлттэй",                                 count: fa.length },
    { id: "history" as Tab,   label: "Өгсөн",                                                      count: fh.length },
  ]

  const newExams = useMemo(() => available.filter(e => e.is_new), [available])
  const recommendedExams = useMemo(() => available.filter(e => e.is_recommended), [available])

  return (
    <div className="space-y-4">
      <div className="space-y-5">
        <FeaturedSection
          icon={<Sparkles className="size-4 text-indigo-500" />}
          title="Шинэ шалгалт"
          exams={newExams}
          emptyText="Шинэ шалгалт одоогоор байхгүй."
        />
        <FeaturedSection
          icon={<Star className="size-4 text-amber-500" />}
          title="Санал болгох шалгалт"
          exams={recommendedExams}
          emptyText="Санал болгох шалгалт одоогоор байхгүй."
        />
      </div>
      {paymentStatus === "success" && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          ✅ <span>Төлбөр амжилттай. Шалгалт таны жагсаалтад нэмэгдлээ!</span>
        </div>
      )}
      {paymentStatus === "cancelled" && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          ⚠️ <span>Төлбөр цуцлагдлаа. Дахин оролдохдоо "Худалдаж авах" дарна уу.</span>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Шалгалт хайх..."
          className="pl-9 pr-9 h-10 bg-background" />
        {query && (
          <button onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        )}
      </div>

      {q && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{fo.length + fa.length + fh.length}</span> үр дүн</p>}

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
              <p className="text-sm">{q ? "Хайлтад тохирох шалгалт олдсонгүй." : "Танд одоогоор худалдаж авсан шалгалт алга."}</p>
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
                      <Clock className="size-3.5" /><span>{e.duration_minutes} минут</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {e.lastAttemptId
                      ? <div className="flex w-full gap-2">
                          <Button variant="outline" size="sm" className="flex-1 cursor-pointer" asChild>
                            <Link href={`/results/${e.lastAttemptId}`}>Үр дүн харах</Link>
                          </Button>
                          <Button size="sm" className="cursor-pointer" asChild>
                            <Link href={`/exam/${e.id}?retake=1`}><Play className="size-3.5" /></Link>
                          </Button>
                        </div>
                      : <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white cursor-pointer" asChild>
                          <Link href={`/exam/${e.id}`}>Эхлүүлэх<ArrowRight className="size-4" /></Link>
                        </Button>}
                  </CardFooter>
                </Card>
              ))}
            </div>
      )}

      {tab === "available" && (
        fa.length === 0
          ? <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">
              {q ? "Хайлтад тохирох шалгалт олдсонгүй." : "Шинэ шалгалтууд удахгүй гарна."}
            </CardContent></Card>
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fa.map(e => (
                <Card key={e.id} className="group hover:shadow-md transition-shadow border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{e.title}</CardTitle>
                      {e.price === 0
                        ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 shrink-0 text-xs">Үнэгүй</Badge>
                        : <Badge variant="outline" className="shrink-0 text-xs font-semibold">{formatMnt(e.price)}</Badge>}
                    </div>
                    {e.description && <CardDescription className="line-clamp-2 text-xs">{e.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-3.5" /><span>{e.duration_minutes} минут</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {e.price === 0
                      ? <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white cursor-pointer" asChild>
                          <Link href={`/exam/${e.id}`}>Эхлүүлэх<ArrowRight className="size-4" /></Link>
                        </Button>
                      : <BuyButton examId={e.id} />}
                  </CardFooter>
                </Card>
              ))}
            </div>
      )}

      {tab === "history" && (
        fh.length === 0
          ? <Card className="border-dashed"><CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <Trophy className="size-10 text-muted-foreground/50" />
              <p className="text-sm">{q ? "Хайлтад тохирох шалгалт олдсонгүй." : "Дүүргэсэн шалгалт байхгүй байна."}</p>
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
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="outline" className="w-full cursor-pointer" size="sm" asChild>
                      <Link href={`/results/${a.id}`}>Дэлгэрэнгүй харах<ArrowRight className="size-4" /></Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
      )}
    </div>
  )
}
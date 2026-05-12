"use client"

import { useState, useMemo, type ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Clock, ShoppingCart, BookOpen, Trophy, ArrowRight,
  Play, Search, X, Loader2, RotateCcw, CheckCircle, Users,
} from "lucide-react"
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
export type MyClass = {
  id: string; slug: string; name: string; description: string | null
  coverUrl: string | null; memberCount: number; teacherName: string | null; isOwn: boolean
}

function formatMnt(n: number) { return new Intl.NumberFormat("mn-MN").format(n) + "\u20ae" }

const COVER_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-violet-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
]
function gradientFor(slug: string) {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) & 0xffffff
  return COVER_GRADIENTS[Math.abs(h) % COVER_GRADIENTS.length]
}

const SUBJECT_THEMES: { keywords: string[]; gradient: string; emoji: string }[] = [
  { keywords: ["\u0430\u043d\u0433\u043b\u0438"],        gradient: "from-sky-400 to-blue-500",       emoji: "\ud83c\uddec\ud83c\udde7" },
  { keywords: ["\u043c\u043e\u043d\u0433\u043e\u043b"],       gradient: "from-emerald-400 to-teal-500",   emoji: "\ud83c\uddf2\ud83c\uddf3" },
  { keywords: ["\u043c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a"],    gradient: "from-orange-400 to-amber-500",   emoji: "\ud83d\udcd0" },
  { keywords: ["\u0431\u0438\u043e\u043b\u043e\u0433\u0438"],      gradient: "from-violet-400 to-purple-500",  emoji: "\ud83e\uddec" },
  { keywords: ["\u0433\u0430\u0437\u0430\u0440\u0437\u04af\u0439"],     gradient: "from-yellow-400 to-orange-400",  emoji: "\ud83d\uddfa\ufe0f" },
  { keywords: ["\u0444\u0438\u0437\u0438\u043a"],        gradient: "from-blue-500 to-indigo-600",    emoji: "\u26a1" },
  { keywords: ["\u0445\u0438\u043c\u0438"],         gradient: "from-pink-400 to-rose-500",      emoji: "\ud83e\uddea" },
  { keywords: ["\u0442\u04af\u04af\u0445"],         gradient: "from-amber-400 to-yellow-500",   emoji: "\ud83d\udcdc" },
  { keywords: ["\u043d\u0438\u0439\u0433\u044d\u043c"],       gradient: "from-cyan-400 to-sky-500",       emoji: "\ud83c\udf0d" },
  { keywords: ["\u0443\u0440\u0430\u043d \u0437\u043e\u0445\u0438\u043e\u043b"],  gradient: "from-fuchsia-400 to-pink-500",   emoji: "\ud83d\udcda" },
]
const DEFAULT_THEME = { gradient: "from-indigo-500 to-violet-600", emoji: "\ud83d\udcdd" }

function getTheme(title: string) {
  const t = title.toLowerCase()
  return SUBJECT_THEMES.find(s => s.keywords.some(k => t.includes(k))) ?? DEFAULT_THEME
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444"
  const label = score >= 70 ? "\u0421\u0430\u0439\u043d" : score >= 40 ? "\u0414\u0443\u043d\u0434" : "\u041c\u0443\u0443"
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex size-14 items-center justify-center rounded-full text-white text-lg font-extrabold shadow-inner"
        style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.2) 0deg)` }}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
          {score.toFixed(0)}
        </div>
      </div>
      <span className="text-xs font-semibold text-white/80">{label}</span>
    </div>
  )
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
          <p className="text-lg font-semibold">\u041d\u044d\u0445\u044d\u043c\u0436\u043b\u044d\u043b \u04af\u04af\u0441\u0433\u044d\u0436 \u0431\u0430\u0439\u043d\u0430...</p>
          <p className="text-sm text-muted-foreground">\u0422\u04e9\u043b\u0431\u04e9\u0440\u0438\u0439\u043d \u0445\u0443\u0443\u0434\u0430\u0441 \u0440\u0443\u0443 \u0448\u0438\u043b\u0436\u0438\u0436 \u0431\u0430\u0439\u043d\u0430, \u0445\u04af\u043b\u044d\u044d\u043d\u044d \u04af\u04af</p>
        </div>
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="size-2 rounded-full bg-indigo-500"
              style={{ animation: `bncDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
      <style>{"@keyframes bncDot { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }"}</style>
    </div>
  )
}

function BuyButton({ examId, large }: { examId: string; large?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy() {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/byl/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examSetId: examId }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) { setError(json.error ?? "\u0410\u043b\u0434\u0430\u0430 \u0433\u0430\u0440\u043b\u0430\u0430."); setLoading(false); return }
      setRedirecting(true)
      await new Promise(r => setTimeout(r, 80))
      window.location.href = json.url
    } catch { setError("\u0421\u04af\u043b\u0436\u044d\u044d\u043d\u0438\u0439 \u0430\u043b\u0434\u0430\u0430 \u0433\u0430\u0440\u043b\u0430\u0430."); setLoading(false) }
  }

  return (
    <>
      {redirecting && <CheckoutOverlay />}
      <div className="w-full space-y-1">
        <button
          onClick={handleBuy}
          disabled={loading || redirecting}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white cursor-pointer",
            "bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all active:scale-95 disabled:opacity-60",
            large ? "py-3 text-base" : "py-2.5 text-sm"
          )}
        >
          {loading || redirecting
            ? <><Loader2 className="size-4 animate-spin" />{redirecting ? "\u0428\u0438\u043b\u0436\u0438\u0436 \u0431\u0430\u0439\u043d\u0430..." : "\u041d\u044d\u0445\u044d\u043c\u0436\u043b\u044d\u043b..."}</>
            : <><ShoppingCart className={large ? "size-5" : "size-4"} />\u0425\u0443\u0434\u0430\u043b\u0434\u0430\u0436 \u0430\u0432\u0430\u0445</>}
        </button>
        {error && <p className="text-xs text-red-200 text-center">{error}</p>}
      </div>
    </>
  )
}

function OwnedCard({ exam }: { exam: OwnedExam }) {
  const { gradient, emoji } = getTheme(exam.title)
  return (
    <div className={cn("relative rounded-2xl bg-gradient-to-br p-5 flex flex-col gap-4 shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 overflow-hidden", gradient)}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-4xl select-none">{emoji}</div>
        {exam.lastScore !== null && <ScoreRing score={exam.lastScore} />}
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-extrabold text-white leading-tight">{exam.title}</h3>
        {exam.description && <p className="mt-1.5 text-sm text-white/70 line-clamp-2">{exam.description}</p>}
        <div className="mt-2 flex items-center gap-1.5 text-sm text-white/60">
          <Clock className="size-3.5" /><span>{exam.duration_minutes} \u043c\u0438\u043d\u0443\u0442</span>
        </div>
      </div>
      <div className="flex gap-2">
        {exam.lastAttemptId ? (
          <>
            <Link href={`/results/${exam.lastAttemptId}`} className="flex-1">
              <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition-all cursor-pointer">
                <CheckCircle className="size-4" />\u04ae\u0440 \u0434\u04af\u043d
              </button>
            </Link>
            <Link href={`/exam/${exam.id}?retake=1`}>
              <button className="flex items-center justify-center px-3 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer">
                <RotateCcw className="size-4" />
              </button>
            </Link>
          </>
        ) : (
          <Link href={`/exam/${exam.id}`} className="w-full">
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/25 hover:bg-white/35 text-white font-bold text-base transition-all cursor-pointer active:scale-95">
              <Play className="size-5" />\u042d\u0445\u043b\u04af\u04af\u043b\u044d\u0445
            </button>
          </Link>
        )}
      </div>
    </div>
  )
}

function AvailableCard({ exam }: { exam: AvailableExam }) {
  const { gradient, emoji } = getTheme(exam.title)
  return (
    <div className={cn("relative rounded-2xl bg-gradient-to-br p-5 flex flex-col gap-4 shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 overflow-hidden", gradient)}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-4xl select-none">{emoji}</div>
        <div className="flex flex-col items-end gap-1">
          {exam.is_new && <span className="text-xs font-bold bg-white/30 text-white px-2.5 py-1 rounded-full">\u0428\u0438\u043d\u044d</span>}
          {exam.is_recommended && <span className="text-xs font-bold bg-yellow-300/80 text-yellow-900 px-2.5 py-1 rounded-full">\u2b50 \u0421\u0430\u043d\u0430\u043b</span>}
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-extrabold text-white leading-tight">{exam.title}</h3>
        {exam.description && <p className="mt-1.5 text-sm text-white/70 line-clamp-2">{exam.description}</p>}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-white/60">
            <Clock className="size-3.5" /><span>{exam.duration_minutes} \u043c\u0438\u043d\u0443\u0442</span>
          </div>
          <span className="text-lg font-extrabold text-white">
            {exam.price === 0 ? "\u04ae\u043d\u044d\u0433\u04af\u0439" : formatMnt(exam.price)}
          </span>
        </div>
      </div>
      {exam.price === 0 ? (
        <Link href={`/exam/${exam.id}`} className="w-full">
          <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/25 hover:bg-white/35 text-white font-bold text-base transition-all cursor-pointer active:scale-95">
            <Play className="size-5" />\u042d\u0445\u043b\u04af\u04af\u043b\u044d\u0445
          </button>
        </Link>
      ) : (
        <BuyButton examId={exam.id} large />
      )}
    </div>
  )
}

function HistoryCard({ attempt }: { attempt: SubmittedAttempt }) {
  const { gradient, emoji } = getTheme(attempt.examTitle)
  return (
    <div className={cn("relative rounded-2xl bg-gradient-to-br p-5 flex flex-col gap-4 shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 overflow-hidden", gradient)}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-4xl select-none">{emoji}</div>
        <ScoreRing score={attempt.score} />
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-extrabold text-white leading-tight">{attempt.examTitle}</h3>
        <p className="mt-1 text-sm text-white/60">
          {attempt.submittedAt
            ? new Date(attempt.submittedAt).toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" })
            : "\u2014"}
        </p>
      </div>
      <Link href={`/results/${attempt.id}`} className="w-full">
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/25 hover:bg-white/35 text-white font-bold text-base transition-all cursor-pointer active:scale-95">
          <ArrowRight className="size-5" />\u0414\u044d\u043b\u0433\u044d\u0440\u044d\u043d\u0433\u04af\u0439
        </button>
      </Link>
    </div>
  )
}

export function DashboardClient({ owned, available, history, paymentStatus, myClasses }: {
  owned: OwnedExam[]; available: AvailableExam[]; history: SubmittedAttempt[]
  paymentStatus?: "success" | "cancelled" | null
  myClasses?: MyClass[]
}) {
  const [tab, setTab] = useState<Tab>(owned.length > 0 ? "owned" : "available")
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()

  const fo = useMemo(() => q ? owned.filter(e => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q)) : owned, [owned, q])
  const fa = useMemo(() => q ? available.filter(e => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q)) : available, [available, q])
  const fh = useMemo(() => q ? history.filter(a => a.examTitle.toLowerCase().includes(q)) : history, [history, q])

  const tabs: { id: Tab; label: string; count: number; icon: ReactNode }[] = [
    { id: "owned",     label: "\u041c\u0438\u043d\u0438\u0439 \u0448\u0430\u043b\u0433\u0430\u043b\u0442", count: fo.length, icon: <BookOpen className="size-4" /> },
    { id: "available", label: "\u041d\u044d\u044d\u043b\u0442\u044d\u0439",      count: fa.length, icon: <ShoppingCart className="size-4" /> },
    { id: "history",   label: "\u04e8\u0433\u0441\u04e9\u043d",          count: fh.length, icon: <Trophy className="size-4" /> },
  ]

  return (
    <div className="space-y-6">
      {paymentStatus === "success" && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-5 py-4 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
          <span className="text-2xl">\u2705</span>
          <div>
            <p className="font-bold text-base">\u0422\u04e9\u043b\u0431\u04e9\u0440 \u0430\u043c\u0436\u0438\u043b\u0442\u0442\u0430\u0439!</p>
            <p className="text-sm opacity-80">\u0428\u0430\u043b\u0433\u0430\u043b\u0442 \u0442\u0430\u043d\u044b \u0436\u0430\u0433\u0441\u0430\u0430\u043b\u0442\u0430\u0434 \u043d\u044d\u043c\u044d\u0433\u0434\u043b\u044d\u044d.</p>
          </div>
        </div>
      )}
      {paymentStatus === "cancelled" && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-5 py-4 text-amber-800 dark:text-amber-300 flex items-center gap-3">
          <span className="text-2xl">\u26a0\ufe0f</span>
          <div>
            <p className="font-bold text-base">\u0422\u04e9\u043b\u0431\u04e9\u0440 \u0446\u0443\u0446\u043b\u0430\u0433\u0434\u043b\u0430\u0430</p>
            <p className="text-sm opacity-80">\u0414\u0430\u0445\u0438\u043d \u043e\u0440\u043e\u043b\u0434\u043e\u0445\u0434\u043e\u043e \u201c\u0425\u0443\u0434\u0430\u043b\u0434\u0430\u0436 \u0430\u0432\u0430\u0445\u201d \u0434\u0430\u0440\u043d\u0430 \u04af\u04af.</p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="\u0428\u0430\u043b\u0433\u0430\u043b\u0442 \u0445\u0430\u0439\u0445..."
          className="pl-12 pr-12 h-12 text-base rounded-xl bg-muted/50 border-border/50"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer",
              tab === t.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {t.icon}
            {t.label}
            <span className={cn(
              "inline-flex items-center justify-center rounded-full w-5 h-5 text-xs font-bold",
              tab === t.id ? "bg-white/25 text-white" : "bg-background text-muted-foreground"
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "owned" && (
        fo.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 py-16 flex flex-col items-center gap-4 text-muted-foreground">
            <BookOpen className="size-14 opacity-30" />
            <div className="text-center">
              <p className="text-lg font-semibold">{q ? "\u0425\u0430\u0439\u043b\u0442\u0430\u0434 \u0442\u043e\u0445\u0438\u0440\u043e\u0445 \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u043e\u043b\u0434\u0441\u043e\u043d\u0433\u04af\u0439." : "\u0422\u0430\u043d\u0434 \u043e\u0434\u043e\u043e\u0433\u0432\u043e\u0440 \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u0430\u043b\u0433\u0430."}</p>
              {!q && <p className="text-sm mt-1">\u041d\u044d\u044d\u043b\u0442\u044d\u0439 \u0448\u0430\u043b\u0433\u0430\u043b\u0442\u0443\u0443\u0434\u0430\u0430\u0441 \u0445\u0443\u0434\u0430\u043b\u0434\u0430\u0436 \u0430\u0432\u0430\u0430\u0440\u0430\u0439!</p>}
            </div>
            {!q && (
              <button onClick={() => setTab("available")} className="mt-2 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer">
                \u0428\u0430\u043b\u0433\u0430\u043b\u0442 \u0445\u0430\u0440\u0430\u0445 <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fo.map(e => <OwnedCard key={e.id} exam={e} />)}
          </div>
        )
      )}

      {tab === "available" && (
        fa.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <ShoppingCart className="size-14 opacity-30" />
            <p className="text-lg font-semibold">{q ? "\u0425\u0430\u0439\u043b\u0442\u0430\u0434 \u0442\u043e\u0445\u0438\u0440\u043e\u0445 \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u043e\u043b\u0434\u0441\u043e\u043d\u0433\u04af\u0439." : "\u0428\u0438\u043d\u044d \u0448\u0430\u043b\u0433\u0430\u043b\u0442\u0443\u0443\u0434 \u0443\u0434\u0430\u0445\u0433\u04af\u0439 \u0433\u0430\u0440\u043d\u0430."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fa.map(e => <AvailableCard key={e.id} exam={e} />)}
          </div>
        )
      )}

      {myClasses && myClasses.length > 0 && tab === "owned" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">\u041c\u0438\u043d\u0438\u0439 \u0430\u043d\u0433\u0438\u0443\u0434</h2>
            <Link href="/classes" className="text-sm text-indigo-500 hover:underline">\u0411\u04af\u0433\u0434\u0438\u0439\u0433 \u04af\u0437\u044d\u0445 \u2192</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myClasses.map((cls) => {
              const grad = gradientFor(cls.slug)
              return (
                <Link key={cls.id} href={`/classes/${cls.slug}`} className="group rounded-2xl border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all">
                  <div className={`h-16 bg-gradient-to-br ${grad} relative`}>
                    {cls.coverUrl && <img src={cls.coverUrl} alt={cls.name} className="absolute inset-0 w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-black/20" />
                    {cls.isOwn && <span className="absolute top-2 right-2 text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5">\u0411\u0430\u0433\u0448</span>}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">{cls.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Users className="size-3" />{cls.memberCount} \u0433\u0438\u0448\u04af\u04af\u043d
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {tab === "history" && (
        fh.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Trophy className="size-14 opacity-30" />
            <p className="text-lg font-semibold">{q ? "\u0425\u0430\u0439\u043b\u0442\u0430\u0434 \u0442\u043e\u0445\u0438\u0440\u043e\u0445 \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u043e\u043b\u0434\u0441\u043e\u043d\u0433\u04af\u0439." : "\u0414\u04af\u04af\u0440\u0433\u044d\u0441\u044d\u043d \u0448\u0430\u043b\u0433\u0430\u043b\u0442 \u0431\u0430\u0439\u0445\u0433\u04af\u0439 \u0431\u0430\u0439\u043d\u0430."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fh.map(a => <HistoryCard key={a.id} attempt={a} />)}
          </div>
        )
      )}
    </div>
  )
}

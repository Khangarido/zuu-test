"use client"

import { useState, useMemo, type ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Clock, ShoppingCart, BookOpen, Trophy, ArrowRight,
  Play, Search, X, Loader2, RotateCcw, CheckCircle,
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

function formatMnt(n: number) { return new Intl.NumberFormat("mn-MN").format(n) + "₮" }

// Map exam title keywords → card gradient + emoji
const SUBJECT_THEMES: { keywords: string[]; gradient: string; emoji: string }[] = [
  { keywords: ["англи"],        gradient: "from-sky-400 to-blue-500",       emoji: "🇬🇧" },
  { keywords: ["монгол"],       gradient: "from-emerald-400 to-teal-500",   emoji: "🇲🇳" },
  { keywords: ["математик"],    gradient: "from-orange-400 to-amber-500",   emoji: "📐" },
  { keywords: ["биологи"],      gradient: "from-violet-400 to-purple-500",  emoji: "🧬" },
  { keywords: ["газарзүй"],     gradient: "from-yellow-400 to-orange-400",  emoji: "🗺️" },
  { keywords: ["физик"],        gradient: "from-blue-500 to-indigo-600",    emoji: "⚡" },
  { keywords: ["хими"],         gradient: "from-pink-400 to-rose-500",      emoji: "🧪" },
  { keywords: ["түүх"],         gradient: "from-amber-400 to-yellow-500",   emoji: "📜" },
  { keywords: ["нийгэм"],       gradient: "from-cyan-400 to-sky-500",       emoji: "🌍" },
  { keywords: ["уран зохиол"],  gradient: "from-fuchsia-400 to-pink-500",   emoji: "📚" },
]
const DEFAULT_THEME = { gradient: "from-indigo-500 to-violet-600", emoji: "📝" }

function getTheme(title: string) {
  const t = title.toLowerCase()
  return SUBJECT_THEMES.find(s => s.keywords.some(k => t.includes(k))) ?? DEFAULT_THEME
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444"
  const label = score >= 70 ? "Сайн" : score >= 40 ? "Дунд" : "Муу"
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

// ── CHECKOUT OVERLAY ──────────────────────────────────────────────────────────
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
            <div key={i} className="size-2 rounded-full bg-indigo-500"
              style={{ animation: `bncDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes bncDot { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  )
}

// ── BUY BUTTON ────────────────────────────────────────────────────────────────
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
      if (!res.ok || !json.url) { setError(json.error ?? "Алдаа гарлаа."); setLoading(false); return }
      setRedirecting(true)
      // Small delay so React can paint the overlay before the browser navigates
      await new Promise(r => setTimeout(r, 80))
      window.location.href = json.url
    } catch { setError("Сүлжээний алдаа гарлаа."); setLoading(false) }
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
            ? <><Loader2 className="size-4 animate-spin" />{redirecting ? "Шилжиж байна..." : "Нэхэмжлэл..."}</>
            : <><ShoppingCart className={large ? "size-5" : "size-4"} />Худалдаж авах</>}
        </button>
        {error && <p className="text-xs text-red-200 text-center">{error}</p>}
      </div>
    </>
  )
}

// ── OWNED EXAM CARD ───────────────────────────────────────────────────────────
function OwnedCard({ exam }: { exam: OwnedExam }) {
  const { gradient, emoji } = getTheme(exam.title)
  return (
    <div className={cn("relative rounded-2xl bg-gradient-to-br p-5 flex flex-col gap-4 shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 overflow-hidden", gradient)}>
      {/* subtle noise overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      <div className="flex items-start justify-between gap-3">
        <div className="text-4xl select-none">{emoji}</div>
        {exam.lastScore !== null && <ScoreRing score={exam.lastScore} />}
      </div>

      <div className="flex-1">
        <h3 className="text-xl font-extrabold text-white leading-tight">{exam.title}</h3>
        {exam.description && (
          <p className="mt-1.5 text-sm text-white/70 line-clamp-2">{exam.description}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-sm text-white/60">
          <Clock className="size-3.5" /><span>{exam.duration_minutes} минут</span>
        </div>
      </div>

      <div className="flex gap-2">
        {exam.lastAttemptId ? (
          <>
            <Link href={`/results/${exam.lastAttemptId}`} className="flex-1">
              <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition-all cursor-pointer">
                <CheckCircle className="size-4" />Үр дүн
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
              <Play className="size-5" />Эхлүүлэх
            </button>
          </Link>
        )}
      </div>
    </div>
  )
}

// ── AVAILABLE EXAM CARD ───────────────────────────────────────────────────────
function AvailableCard({ exam }: { exam: AvailableExam }) {
  const { gradient, emoji } = getTheme(exam.title)
  return (
    <div className={cn("relative rounded-2xl bg-gradient-to-br p-5 flex flex-col gap-4 shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 overflow-hidden", gradient)}>
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      <div className="flex items-start justify-between gap-3">
        <div className="text-4xl select-none">{emoji}</div>
        <div className="flex flex-col items-end gap-1">
          {exam.is_new && (
            <span className="text-xs font-bold bg-white/30 text-white px-2.5 py-1 rounded-full">Шинэ</span>
          )}
          {exam.is_recommended && (
            <span className="text-xs font-bold bg-yellow-300/80 text-yellow-900 px-2.5 py-1 rounded-full">⭐ Санал</span>
          )}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-xl font-extrabold text-white leading-tight">{exam.title}</h3>
        {exam.description && (
          <p className="mt-1.5 text-sm text-white/70 line-clamp-2">{exam.description}</p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-white/60">
            <Clock className="size-3.5" /><span>{exam.duration_minutes} минут</span>
          </div>
          <span className="text-lg font-extrabold text-white">
            {exam.price === 0 ? "Үнэгүй" : formatMnt(exam.price)}
          </span>
        </div>
      </div>

      {exam.price === 0 ? (
        <Link href={`/exam/${exam.id}`} className="w-full">
          <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/25 hover:bg-white/35 text-white font-bold text-base transition-all cursor-pointer active:scale-95">
            <Play className="size-5" />Эхлүүлэх
          </button>
        </Link>
      ) : (
        <BuyButton examId={exam.id} large />
      )}
    </div>
  )
}

// ── HISTORY CARD ──────────────────────────────────────────────────────────────
function HistoryCard({ attempt }: { attempt: SubmittedAttempt }) {
  const { gradient, emoji } = getTheme(attempt.examTitle)
  return (
    <div className={cn("relative rounded-2xl bg-gradient-to-br p-5 flex flex-col gap-4 shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 overflow-hidden", gradient)}>
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      <div className="flex items-start justify-between gap-3">
        <div className="text-4xl select-none">{emoji}</div>
        <ScoreRing score={attempt.score} />
      </div>

      <div className="flex-1">
        <h3 className="text-xl font-extrabold text-white leading-tight">{attempt.examTitle}</h3>
        <p className="mt-1 text-sm text-white/60">
          {attempt.submittedAt
            ? new Date(attempt.submittedAt).toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" })
            : "—"}
        </p>
      </div>

      <Link href={`/results/${attempt.id}`} className="w-full">
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/25 hover:bg-white/35 text-white font-bold text-base transition-all cursor-pointer active:scale-95">
          <ArrowRight className="size-5" />Дэлгэрэнгүй
        </button>
      </Link>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function DashboardClient({ owned, available, history, paymentStatus }: {
  owned: OwnedExam[]; available: AvailableExam[]; history: SubmittedAttempt[]
  paymentStatus?: "success" | "cancelled" | null
}) {
  const [tab, setTab] = useState<Tab>(owned.length > 0 ? "owned" : "available")
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()

  const fo = useMemo(() => q ? owned.filter(e => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q)) : owned, [owned, q])
  const fa = useMemo(() => q ? available.filter(e => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q)) : available, [available, q])
  const fh = useMemo(() => q ? history.filter(a => a.examTitle.toLowerCase().includes(q)) : history, [history, q])

  const tabs: { id: Tab; label: string; count: number; icon: ReactNode }[] = [
    { id: "owned",     label: "Миний шалгалт", count: fo.length, icon: <BookOpen className="size-4" /> },
    { id: "available", label: "Нээлттэй",      count: fa.length, icon: <ShoppingCart className="size-4" /> },
    { id: "history",   label: "Өгсөн",          count: fh.length, icon: <Trophy className="size-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Payment banners */}
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
            <p className="text-sm opacity-80">Дахин оролдохдоо "Худалдаж авах" дарна уу.</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Шалгалт хайх..."
          className="pl-12 pr-12 h-12 text-base rounded-xl bg-muted/50 border-border/50"
        />
        {query && (
          <button onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
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

      {q && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{fo.length + fa.length + fh.length}</span> үр дүн олдлоо
        </p>
      )}

      {/* Owned tab */}
      {tab === "owned" && (
        fo.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 py-16 flex flex-col items-center gap-4 text-muted-foreground">
            <BookOpen className="size-14 opacity-30" />
            <div className="text-center">
              <p className="text-lg font-semibold">{q ? "Хайлтад тохирох шалгалт олдсонгүй." : "Танд одоогоор шалгалт алга."}</p>
              {!q && <p className="text-sm mt-1">Нээлттэй шалгалтуудаас худалдаж аваарай!</p>}
            </div>
            {!q && (
              <button onClick={() => setTab("available")}
                className="mt-2 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer">
                Шалгалт харах <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fo.map(e => <OwnedCard key={e.id} exam={e} />)}
          </div>
        )
      )}

      {/* Available tab */}
      {tab === "available" && (
        fa.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <ShoppingCart className="size-14 opacity-30" />
            <p className="text-lg font-semibold">{q ? "Хайлтад тохирох шалгалт олдсонгүй." : "Шинэ шалгалтууд удахгүй гарна."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fa.map(e => <AvailableCard key={e.id} exam={e} />)}
          </div>
        )
      )}

      {/* History tab */}
      {tab === "history" && (
        fh.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Trophy className="size-14 opacity-30" />
            <p className="text-lg font-semibold">{q ? "Хайлтад тохирох шалгалт олдсонгүй." : "Дүүргэсэн шалгалт байхгүй байна."}</p>
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

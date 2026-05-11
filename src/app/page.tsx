"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  GraduationCap,
  Trophy,
  BarChart3,
  Zap,
  DollarSign,
  BookOpen,
  ChevronDown,
  ArrowRight,
  Check,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Pre-defined floater positions (avoids SSR hydration mismatch) ────────
const FLOATERS = [
  { id: 0,  top: 2,  left: 8,  size: 14, delay: 0.0,  dur: 6.2, anim: "a" },
  { id: 1,  top: 4,  left: 18, size: 20, delay: 1.2,  dur: 5.5, anim: "b" },
  { id: 2,  top: 7,  left: 32, size: 12, delay: 0.4,  dur: 7.0, anim: "c" },
  { id: 3,  top: 3,  left: 48, size: 28, delay: 2.1,  dur: 5.8, anim: "d" },
  { id: 4,  top: 6,  left: 62, size: 16, delay: 0.8,  dur: 6.5, anim: "e" },
  { id: 5,  top: 2,  left: 75, size: 24, delay: 1.5,  dur: 5.2, anim: "f" },
  { id: 6,  top: 8,  left: 88, size: 18, delay: 0.3,  dur: 6.8, anim: "g" },
  { id: 7,  top: 12, left: 5,  size: 32, delay: 1.8,  dur: 5.6, anim: "h" },
  { id: 8,  top: 14, left: 24, size: 15, delay: 0.6,  dur: 7.2, anim: "a" },
  { id: 9,  top: 10, left: 42, size: 22, delay: 2.4,  dur: 5.9, anim: "b" },
  { id: 10, top: 16, left: 56, size: 13, delay: 1.0,  dur: 6.3, anim: "c" },
  { id: 11, top: 11, left: 70, size: 35, delay: 0.2,  dur: 5.4, anim: "d" },
  { id: 12, top: 18, left: 83, size: 20, delay: 1.7,  dur: 6.7, anim: "e" },
  { id: 13, top: 15, left: 94, size: 16, delay: 0.5,  dur: 5.1, anim: "f" },
  { id: 14, top: 22, left: 2,  size: 25, delay: 2.0,  dur: 6.0, anim: "g" },
  { id: 15, top: 25, left: 14, size: 12, delay: 0.9,  dur: 7.3, anim: "h" },
  { id: 16, top: 28, left: 28, size: 38, delay: 1.3,  dur: 5.7, anim: "a" },
  { id: 17, top: 23, left: 44, size: 18, delay: 2.6,  dur: 6.1, anim: "b" },
  { id: 18, top: 30, left: 58, size: 14, delay: 0.7,  dur: 5.5, anim: "c" },
  { id: 19, top: 26, left: 72, size: 28, delay: 1.4,  dur: 6.9, anim: "d" },
  { id: 20, top: 33, left: 86, size: 22, delay: 0.1,  dur: 5.3, anim: "e" },
  { id: 21, top: 37, left: 8,  size: 16, delay: 2.3,  dur: 6.6, anim: "f" },
  { id: 22, top: 35, left: 20, size: 42, delay: 1.1,  dur: 5.0, anim: "g" },
  { id: 23, top: 38, left: 35, size: 13, delay: 0.4,  dur: 7.1, anim: "h" },
  { id: 24, top: 32, left: 50, size: 30, delay: 1.9,  dur: 5.8, anim: "a" },
  { id: 25, top: 40, left: 65, size: 17, delay: 2.7,  dur: 6.4, anim: "b" },
  { id: 26, top: 36, left: 78, size: 24, delay: 0.6,  dur: 5.6, anim: "c" },
  { id: 27, top: 39, left: 92, size: 12, delay: 1.6,  dur: 7.0, anim: "d" },
  { id: 28, top: 42, left: 5,  size: 35, delay: 0.3,  dur: 5.9, anim: "e" },
  { id: 29, top: 45, left: 18, size: 19, delay: 2.1,  dur: 6.2, anim: "f" },
  { id: 30, top: 48, left: 30, size: 14, delay: 1.0,  dur: 5.4, anim: "g" },
  { id: 31, top: 44, left: 46, size: 46, delay: 0.8,  dur: 6.8, anim: "h" },
  { id: 32, top: 50, left: 60, size: 21, delay: 2.5,  dur: 5.1, anim: "a" },
  { id: 33, top: 46, left: 74, size: 13, delay: 1.2,  dur: 7.2, anim: "b" },
  { id: 34, top: 52, left: 88, size: 32, delay: 0.5,  dur: 5.7, anim: "c" },
  { id: 35, top: 55, left: 3,  size: 18, delay: 1.8,  dur: 6.5, anim: "d" },
  { id: 36, top: 58, left: 15, size: 27, delay: 0.2,  dur: 5.3, anim: "e" },
  { id: 37, top: 54, left: 27, size: 15, delay: 2.4,  dur: 6.9, anim: "f" },
  { id: 38, top: 57, left: 40, size: 40, delay: 1.5,  dur: 5.2, anim: "g" },
  { id: 39, top: 53, left: 55, size: 12, delay: 0.7,  dur: 7.3, anim: "h" },
  { id: 40, top: 60, left: 68, size: 23, delay: 1.3,  dur: 5.6, anim: "a" },
  { id: 41, top: 56, left: 82, size: 36, delay: 2.0,  dur: 6.1, anim: "b" },
  { id: 42, top: 62, left: 7,  size: 16, delay: 0.9,  dur: 5.8, anim: "c" },
  { id: 43, top: 65, left: 22, size: 44, delay: 1.7,  dur: 6.4, anim: "d" },
  { id: 44, top: 68, left: 36, size: 14, delay: 0.4,  dur: 5.0, anim: "e" },
  { id: 45, top: 63, left: 50, size: 28, delay: 2.2,  dur: 7.0, anim: "f" },
  { id: 46, top: 70, left: 64, size: 19, delay: 1.0,  dur: 5.5, anim: "g" },
  { id: 47, top: 66, left: 78, size: 12, delay: 0.6,  dur: 6.7, anim: "h" },
  { id: 48, top: 73, left: 90, size: 33, delay: 1.4,  dur: 5.3, anim: "a" },
  { id: 49, top: 75, left: 10, size: 20, delay: 2.8,  dur: 6.0, anim: "b" },
  { id: 50, top: 72, left: 25, size: 15, delay: 0.3,  dur: 7.1, anim: "c" },
  { id: 51, top: 78, left: 38, size: 38, delay: 1.6,  dur: 5.7, anim: "d" },
  { id: 52, top: 74, left: 52, size: 13, delay: 2.1,  dur: 6.3, anim: "e" },
  { id: 53, top: 80, left: 66, size: 26, delay: 0.8,  dur: 5.9, anim: "f" },
  { id: 54, top: 76, left: 80, size: 18, delay: 1.9,  dur: 6.6, anim: "g" },
  { id: 55, top: 82, left: 4,  size: 22, delay: 0.5,  dur: 5.4, anim: "h" },
  { id: 56, top: 85, left: 16, size: 12, delay: 2.3,  dur: 7.2, anim: "a" },
  { id: 57, top: 83, left: 30, size: 30, delay: 1.1,  dur: 5.1, anim: "b" },
  { id: 58, top: 88, left: 44, size: 16, delay: 0.2,  dur: 6.8, anim: "c" },
  { id: 59, top: 86, left: 58, size: 42, delay: 1.7,  dur: 5.6, anim: "d" },
  { id: 60, top: 90, left: 72, size: 14, delay: 2.5,  dur: 6.2, anim: "e" },
  { id: 61, top: 87, left: 85, size: 24, delay: 0.6,  dur: 5.8, anim: "f" },
  { id: 62, top: 93, left: 6,  size: 18, delay: 1.4,  dur: 7.0, anim: "g" },
  { id: 63, top: 95, left: 20, size: 35, delay: 0.9,  dur: 5.3, anim: "h" },
  { id: 64, top: 92, left: 34, size: 12, delay: 2.0,  dur: 6.5, anim: "a" },
  { id: 65, top: 97, left: 48, size: 28, delay: 0.3,  dur: 5.7, anim: "b" },
  { id: 66, top: 94, left: 62, size: 16, delay: 1.6,  dur: 6.1, anim: "c" },
  { id: 67, top: 96, left: 76, size: 20, delay: 2.4,  dur: 5.4, anim: "d" },
  { id: 68, top: 91, left: 90, size: 14, delay: 1.0,  dur: 6.9, anim: "e" },
  { id: 69, top: 20, left: 96, size: 16, delay: 1.5,  dur: 5.6, anim: "f" },
  { id: 70, top: 45, left: 97, size: 22, delay: 0.7,  dur: 6.3, anim: "g" },
  { id: 71, top: 70, left: 97, size: 12, delay: 2.2,  dur: 5.9, anim: "h" },
  { id: 72, top: 85, left: 96, size: 18, delay: 0.4,  dur: 7.1, anim: "a" },
  { id: 73, top: 8,  left: 0,  size: 24, delay: 1.8,  dur: 5.2, anim: "b" },
  { id: 74, top: 30, left: 1,  size: 14, delay: 0.1,  dur: 6.7, anim: "c" },
  { id: 75, top: 60, left: 0,  size: 30, delay: 2.6,  dur: 5.5, anim: "d" },
  { id: 76, top: 80, left: 1,  size: 16, delay: 1.3,  dur: 6.0, anim: "e" },
  { id: 77, top: 50, left: 90, size: 12, delay: 0.6,  dur: 7.3, anim: "f" },
  { id: 78, top: 20, left: 50, size: 48, delay: 1.2,  dur: 5.0, anim: "g" },
  { id: 79, top: 65, left: 42, size: 26, delay: 2.9,  dur: 6.4, anim: "h" },
  { id: 80, top: 41, left: 12, size: 33, delay: 0.8,  dur: 5.8, anim: "a" },
  { id: 81, top: 19, left: 68, size: 15, delay: 1.9,  dur: 6.2, anim: "b" },
  { id: 82, top: 77, left: 55, size: 28, delay: 0.3,  dur: 5.6, anim: "c" },
  { id: 83, top: 88, left: 28, size: 12, delay: 2.1,  dur: 7.0, anim: "d" },
]

// Bento grid — large: true = col-span-2 on lg
// Row 1: Trophy(2) + BarChart3(1) = 3
// Row 2: Zap(1) + BookOpen(2)    = 3
// Row 3: DollarSign(2) + GradCap(1) = 3
const FEATURES = [
  {
    icon: Trophy,
    title: "Blueprint шалгалтууд",
    desc: "Мэргэжлийн багш нарын ЭЕШ-ийн blueprint дагуу хийгдсэн, 100% бодит нийцтэй шалгалтууд.",
    large: true,
  },
  {
    icon: BarChart3,
    title: "Дэлгэрэнгүй шинжилгээ",
    desc: "Сэдэв бүрээр задаргаа авч, нийт сурагчидтай харьцуулагдах rank-аа хар.",
    large: false,
  },
  {
    icon: Zap,
    title: "Өдөр бүр шинэ шалгалт",
    desc: "Тогтмол шинэчлэгддэг контент. Шинэ шалгалт байнга нэмэгдэж байна.",
    large: false,
  },
  {
    icon: BookOpen,
    title: "Үнэгүй материалууд",
    desc: "Өмнөх жилийн ЭЕШ-үүд болон дасгалуудыг бүрэн үнэгүйгээр ашиглаарай.",
    large: true,
  },
  {
    icon: DollarSign,
    title: "Хамгийн хямд үнэ",
    desc: "1 шалгалт = ердөө 1,000₮. Ямар ч subscription шаардлагагүй, хэзээ ч цуцлах боломжтой.",
    large: true,
  },
  {
    icon: GraduationCap,
    title: "Бүх хичээлийн ЭЕШ",
    desc: "Математик, Англи хэл, Газарзүй болон бусад бүх хичээлийн шалгалт нэг дороос.",
    large: false,
  },
]

const STEPS = [
  {
    num: "01",
    icon: Target,
    title: "Бүртгүүлэх",
    desc: "И-мэйлээрээ 30 секундэд бүртгэл үүсгэ. Нэмэлт мэдээлэл шаардлагагүй.",
  },
  {
    num: "02",
    icon: BookOpen,
    title: "Шалгалт сонгох",
    desc: "Хичээл, жил, түвшингээр шүүгээд өөрт тохирох шалгалтыг сонго.",
  },
  {
    num: "03",
    icon: BarChart3,
    title: "Дүнгээ шинжлэх",
    desc: "Хаана алдаж байгаагаа мэд, сэдвийн задаргаа авч, rank харж бэлтгэлээ нарийвчил.",
  },
]

// ─── Hooks ────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true) },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView] as const
}

const SALE_END = new Date("2026-05-13T23:59:00+08:00")

function useCountdown(end: Date) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    function tick() {
      const diff = Math.max(0, end.getTime() - Date.now())
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [end])
  return t
}

function useCountUp(target: number, active: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) { setCount(0); return }
    const dur = 2400
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setCount(Math.round(ease * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, target])
  return count
}

// ─── Components ────────────────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const [ref, inView] = useInView(0.08)
  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

function ScoreRing({ progress = 0 }: { progress?: number }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - progress)
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(99,102,241,0.18)" strokeWidth="5" />
      <circle
        cx="32" cy="32" r={r} fill="none"
        stroke="url(#score-grad)" strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.34,1.56,0.64,1)" }}
      />
      <defs>
        <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [hovered, setHovered] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [cardHovered, setCardHovered] = useState(false)
  const [statsRef, statsInView] = useInView(0.3)
  const countdown = useCountdown(SALE_END)

  const c1 = useCountUp(1200, statsInView)
  const c2 = useCountUp(50, statsInView)
  const c3 = useCountUp(800, statsInView)
  const cardScore = useCountUp(94, cardHovered)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <div className="bg-[#0a0a0f] text-white min-h-screen font-sans antialiased" suppressHydrationWarning>

      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-[#0a0a0f]/85 backdrop-blur-xl border-b border-white/5 shadow-xl"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 h-20">
          <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Zuu Academy" width={120} height={60} className="h-12 w-auto" priority />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer transition-colors duration-150 text-base px-5 h-11"
              >
                Нэвтрэх
              </Button>
            </Link>
            <Link href="/register">
              <Button
                className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-lg shadow-indigo-500/25 transition-all duration-150 text-base px-5 h-11"
              >
                Бүртгүүлэх
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/8 via-transparent to-[#0a0a0f] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-700/5 blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-800/4 blur-3xl pointer-events-none" />

        {/* Floating 0s */}
        {FLOATERS.map((f) => (
          <span
            key={f.id}
            onMouseEnter={() => setHovered(f.id)}
            onMouseLeave={() => setHovered(null)}
            aria-hidden="true"
            className="absolute select-none cursor-default font-extrabold leading-none"
            style={{
              top: `${f.top}%`,
              left: `${f.left}%`,
              fontSize: f.size,
              color: hovered === f.id ? "#c4b5fd" : "rgba(255,255,255,0.10)",
              textShadow: hovered === f.id
                ? "0 0 20px #8b5cf6, 0 0 40px #7c3aed, 0 0 80px #6366f1"
                : "none",
              transform: hovered === f.id ? "scale(1.18)" : "scale(1)",
              transition: "color 0.2s ease, text-shadow 0.2s ease, transform 0.2s ease",
              animation: `float-${f.anim} ${f.dur}s ease-in-out ${f.delay}s infinite`,
              willChange: "transform",
            }}
          >
            {hovered === f.id ? "800" : "0"}
          </span>
        ))}

        {/* Hero content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 pt-20">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-6 py-2.5 mb-8 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-base font-bold tracking-wide text-indigo-400 uppercase">
              Бидэнтэй цуг
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.04] mb-6">
            Ирээдүйгээ
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              бүтээ
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-white/45 max-w-2xl mx-auto mb-10 leading-relaxed">
            ЭЕШ-д бэлдэх хамгийн ухаалаг арга. Мэргэжлийн багш нарын
            blueprint дагуу бэлтгэгдсэн шалгалтуудаар өндөр оноо ав.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 h-12 text-base font-semibold shadow-2xl shadow-indigo-500/30 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-indigo-500/50"
              >
                Үнэгүй эхлэх
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
              }
              className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-white/20 px-8 h-12 text-base cursor-pointer transition-all duration-200 backdrop-blur-sm"
            >
              Дэлгэрэнгүй
              <ChevronDown className="size-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Floating score card — xl only */}
        <div
          className="absolute right-[7%] top-1/2 hidden xl:block cursor-pointer"
          onMouseEnter={() => setCardHovered(true)}
          onMouseLeave={() => setCardHovered(false)}
          style={{
            transform: "translateY(-50%)",
            animation: "float-card 3.8s ease-in-out infinite",
          }}
        >
          <div className={cn(
            "relative rounded-2xl border bg-white/[0.04] backdrop-blur-2xl p-6 shadow-2xl shadow-black/60 w-40 transition-all duration-300",
            cardHovered ? "border-indigo-500/50 shadow-indigo-500/25" : "border-white/8"
          )}>
            <div className={cn(
              "absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300",
              cardHovered ? "bg-indigo-500/18" : "bg-indigo-500/8"
            )} />
            <div className="relative">
              <div className="flex justify-center">
                <ScoreRing progress={cardScore / 100} />
              </div>
              <div className="mt-3 text-center">
                <div className="text-3xl font-extrabold tabular-nums">{cardScore}%</div>
                <div className="text-xs text-white/35 mt-1 tracking-wide">Таны оноо</div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/8 text-center">
                <div className="text-[10px] text-white/25 uppercase tracking-widest">Математик</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={() =>
            document.getElementById("stats")?.scrollIntoView({ behavior: "smooth" })
          }
          aria-label="Доош гүйлгэх"
          className="absolute bottom-8 left-1/2 cursor-pointer text-white/20 hover:text-white/50 transition-colors duration-200"
          style={{ animation: "float-indicator 2.2s ease-in-out infinite" }}
        >
          <ChevronDown className="size-6" />
        </button>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────── */}
      <section id="stats" className="px-4 sm:px-6 pb-4">
        <div className="mx-auto max-w-5xl">
          <div
            ref={statsRef}
            className="rounded-2xl border border-white/5 bg-white/[0.025] backdrop-blur-sm px-6 py-10"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent tabular-nums">
                  {c1.toLocaleString()}+
                </div>
                <div className="text-sm text-white/35 mt-2 tracking-wide">Шалгалт өгсөн</div>
              </div>
              <div className="sm:border-x border-white/5">
                <div className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent tabular-nums">
                  {c2}+
                </div>
                <div className="text-sm text-white/35 mt-2 tracking-wide">Шалгалтын материал</div>
              </div>
              <div>
                <div className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tabular-nums">
                  {c3}
                </div>
                <div className="text-sm text-white/35 mt-2 tracking-wide">Дээд оноо</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES (BENTO) ────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Яагаад{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Zuu Academy?
              </span>
            </h2>
            <p className="text-white/35 text-lg max-w-lg mx-auto">
              Хамгийн ухаалаг ЭЕШ-д бэлтгэх платформ
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon
              return (
                <FadeIn
                  key={feat.title}
                  delay={i * 70}
                  className={cn(feat.large ? "lg:col-span-2" : "")}
                >
                  <div className="group h-full rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.09] p-6 sm:p-7 cursor-default transition-all duration-300">
                    <div className="flex size-11 items-center justify-center rounded-xl border border-indigo-500/15 bg-indigo-500/8 mb-5 group-hover:bg-indigo-500/14 transition-colors duration-200">
                      <Icon className="size-5 text-indigo-400" />
                    </div>
                    <h3 className="text-base font-semibold mb-2 text-white/90">{feat.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed">{feat.desc}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Хэрхэн ажилладаг вэ?
            </h2>
            <p className="text-white/35 text-lg">3 алхамаар эхэлье</p>
          </FadeIn>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {/* Connecting line — desktop */}
            <div className="absolute top-[52px] left-[calc(16.67%+26px)] right-[calc(16.67%+26px)] hidden md:block">
              <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent" />
              {/* Arrow dots */}
              <div className="absolute left-1/4 -top-1 size-2 rounded-full bg-indigo-500/40" />
              <div className="absolute right-1/4 -top-1 size-2 rounded-full bg-indigo-500/40" />
            </div>

            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <FadeIn key={step.num} delay={i * 130}>
                  <div className="relative flex flex-col items-center text-center">
                    {/* Mobile vertical connector */}
                    {i < STEPS.length - 1 && (
                      <div className="md:hidden absolute -bottom-5 left-1/2 -translate-x-1/2 w-px h-10 bg-gradient-to-b from-indigo-500/30 to-transparent" />
                    )}

                    {/* Icon block */}
                    <div className="relative flex size-[104px] items-center justify-center rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.06] mb-6">
                      <Icon className="size-9 text-indigo-400" />
                      <span className="absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-[11px] font-bold text-white shadow-lg shadow-indigo-500/30">
                        {step.num}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold mb-2 text-white/90">{step.title}</h3>
                    <p className="text-white/38 text-sm leading-relaxed max-w-[240px] mx-auto">
                      {step.desc}
                    </p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Үнэ тариф</h2>
            <p className="text-white/35 text-lg">
              Ямар ч subscription шаардлагагүй — хэрэгтэй шалгалтаа л ав
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Free */}
            <FadeIn delay={0}>
              <div className="h-full flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-7">
                <div className="mb-8">
                  <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-3">
                    Үнэгүй
                  </p>
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-extrabold">0</span>
                    <span className="text-2xl font-bold text-white/50 mb-1">₮</span>
                  </div>
                  <p className="text-white/25 text-xs mt-1">Бүртгэлтэйгээр</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {[
                    "Өмнөх жилийн ЭЕШ материалууд",
                    "Хязгаарлагдмал шалгалтууд",
                    "Үндсэн дүн шинжилгээ",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-white/45">
                      <Check className="size-4 text-white/20 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    variant="outline"
                    className="w-full border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white cursor-pointer transition-all duration-150"
                  >
                    Эхлэх
                  </Button>
                </Link>
              </div>
            </FadeIn>

            {/* Popular */}
            <FadeIn delay={120}>
              <div className="relative h-full">
                {/* Glow layer */}
                <div className="absolute -inset-0.5 rounded-[18px] bg-gradient-to-b from-indigo-500 to-violet-600 opacity-35 blur-lg" />
                <div className="relative h-full flex flex-col rounded-2xl border border-indigo-500/40 bg-[#0d0d1e] p-7">
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">
                        Нэг шалгалт
                      </p>
                      <div className="flex items-end gap-1">
                        <span className="text-5xl font-extrabold">1,000</span>
                        <span className="text-2xl font-bold text-white/60 mb-1">₮</span>
                      </div>
                      <p className="text-white/40 text-xs mt-1">
                        Bundle: 10 шалгалт ={" "}
                        <span className="text-indigo-400 font-semibold">6,900₮</span>
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full border border-indigo-500/35 bg-indigo-500/15 px-2.5 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                      Алдартай
                    </div>
                  </div>
                  <ul className="space-y-3 flex-1 mb-8">
                    {[
                      "Бүх хичээлийн шалгалтууд",
                      "Дэлгэрэнгүй дүн шинжилгээ",
                      "Сэдвийн задаргаа + rank",
                      "Тайлбартай зөв хариулт",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-white/70">
                        <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-500/25 cursor-pointer transition-all duration-200 hover:scale-[1.01]">
                      Шалгалт авах
                      <ArrowRight className="size-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Season */}
            <FadeIn delay={240}>
              <div className="h-full flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-7">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs font-semibold text-white/35 uppercase tracking-widest">
                      Бүтэн улирал
                    </p>
                    <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400 uppercase tracking-wide">
                      Sale
                    </span>
                  </div>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-base font-bold text-white/25 line-through">50,000₮</span>
                    <span className="text-[10px] font-semibold text-rose-400">-50%</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-extrabold">24,900</span>
                    <span className="text-2xl font-bold text-white/50 mb-1">₮</span>
                  </div>
                  <p className="text-white/25 text-xs mt-1">ЭЕШ дуустал нэг хичээл</p>
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-rose-400/80 font-medium">
                    <span>⏱</span>
                    <span>
                      {countdown.d > 0 ? `${countdown.d}х ` : ""}{String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")} үлдсэн
                    </span>
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {[
                    "Нэг хичээлийн бүх материал",
                    "Шалгалтын материалын хязгааргүй хэрэглээ",
                    "Давтагдашгүй үнэ",
                    "Бүх дүн шинжилгээ",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-white/45">
                      <Check className="size-4 text-violet-400/50 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    variant="outline"
                    className="w-full border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white cursor-pointer transition-all duration-150"
                  >
                    Авах
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── CTA BAND ────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/60 to-violet-950/60 px-8 py-14 text-center backdrop-blur-sm">
              <div className="absolute -top-20 -right-20 size-64 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-violet-500/10 blur-3xl" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
                  Өнөөдрөөс эхэл
                </h2>
                <p className="text-white/45 mb-8 text-lg max-w-md mx-auto">
                  Бүртгэл үнэгүй. Нэмэлт мэдээлэл шаардлагагүй. 30 секундэд бэлэн.
                </p>
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-10 h-12 text-base font-semibold shadow-2xl shadow-indigo-500/30 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  >
                    Үнэгүй бүртгүүлэх
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start gap-1.5">
              <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                <Image src="/logo.png" alt="Zuu Academy" width={80} height={40} className="h-8 w-auto" />
              </Link>
              <p className="text-xs text-white/20 italic pl-0.5">Ирээдүйгээ бүтээ</p>
            </div>

            <nav className="flex items-center gap-6">
              <Link
                href="/login"
                className="text-sm text-white/35 hover:text-white/70 cursor-pointer transition-colors duration-150"
              >
                Нэвтрэх
              </Link>
              <Link
                href="/register"
                className="text-sm text-white/35 hover:text-white/70 cursor-pointer transition-colors duration-150"
              >
                Бүртгүүлэх
              </Link>
            </nav>
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.04] text-center">
            <p className="text-xs text-white/15">
              © 2025 Zuu Academy · Veritas Tech. Бүх эрх хуулиар хамгаалагдсан.
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}

"use client"

import { useState, useEffect, useRef, type ElementType, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useInView } from "framer-motion"
import { ArrowRight, Check, ChevronDown, Trophy, BarChart3, Zap, BookOpen, DollarSign, Target } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Data ──────────────────────────────────────────────────────────────────
const SUBJECTS = [
  { name: "Математик",   emoji: "📐", color: "#f97316" },
  { name: "Англи хэл",  emoji: "🇬🇧", color: "#38bdf8" },
  { name: "Монгол хэл", emoji: "🇲🇳", color: "#34d399" },
  { name: "Биологи",    emoji: "🧬", color: "#a78bfa" },
  { name: "Газарзүй",   emoji: "🗺️", color: "#facc15" },
  { name: "Физик",      emoji: "⚡", color: "#60a5fa" },
  { name: "Хими",       emoji: "🧪", color: "#f472b6" },
  { name: "Түүх",       emoji: "📜", color: "#fb923c" },
  { name: "Нийгэм",     emoji: "🌍", color: "#22d3ee" },
]

const FEATURES = [
  { icon: Trophy,     title: "Blueprint шалгалтууд",  desc: "Мэргэжлийн багш нарын ЭЕШ-ийн blueprint дагуу хийгдсэн, 100% бодит нийцтэй шалгалтууд.", large: true  },
  { icon: BarChart3,  title: "Дэлгэрэнгүй шинжилгээ", desc: "Сэдэв бүрээр задаргаа авч нийт сурагчидтай rank харьцуул.",                              large: false },
  { icon: Zap,        title: "Шинэ шалгалт байнга",   desc: "Тогтмол шинэчлэгддэг контент. Шинэ шалгалт байнга нэмэгдэнэ.",                          large: false },
  { icon: BookOpen,   title: "Үнэгүй материалууд",    desc: "Өмнөх жилийн ЭЕШ болон дасгалуудыг бүрэн үнэгүйгээр ашиглаарай.",                       large: true  },
  { icon: DollarSign, title: "Хамгийн хямд үнэ",      desc: "1 шалгалт = ердөө 1,000₮. Subscription шаардлагагүй, хэзээ ч цуцлах боломжтой.",         large: true  },
  { icon: Target,     title: "Бүх хичээлийн ЭЕШ",    desc: "Математик, Англи хэл, Газарзүй болон бусад бүх хичээлийн шалгалт нэг дороос.",            large: false },
]

const STATS = [
  { value: 1200, suffix: "+", label: "Шалгалт өгсөн" },
  { value: 50,   suffix: "+", label: "Шалгалтын сан" },
  { value: 800,  suffix: "",  label: "Дээд оноо" },
]

const STEPS = [
  { num: "01", icon: Target,    title: "Бүртгүүлэх",    desc: "И-мэйлээрээ 30 секундэд бүртгэл үүсгэ. Нэмэлт мэдээлэл шаардлагагүй." },
  { num: "02", icon: BookOpen,  title: "Шалгалт сонгох", desc: "Хичээл, жил, түвшингээр шүүгээд өөрт тохирох шалгалтыг сонго." },
  { num: "03", icon: BarChart3, title: "Дүнгээ шинжлэх", desc: "Хаана алдаж байгааг мэд, rank харж бэлтгэлээ нарийвчил." },
]

// ── Star Tunnel Canvas ─────────────────────────────────────────────────────
function StarTunnel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    if (!ctx) return

    const NUM_STARS = 600
    const FOCAL = 500
    // Use window dimensions — canvas covers full viewport
    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width = W
    canvas.height = H

    type Star = { x: number; y: number; z: number; pz: number }
    let stars: Star[] = []

    function initStars() {
      stars = Array.from({ length: NUM_STARS }, () => {
        const z = Math.random() * W
        return { x: (Math.random() - 0.5) * W * 3, y: (Math.random() - 0.5) * H * 3, z, pz: z }
      })
    }
    initStars()

    let animId: number
    let speed = 5

    function draw() {
      ctx.fillStyle = "rgba(7,7,14,0.22)"
      ctx.fillRect(0, 0, W, H)

      const cx = W / 2
      const cy = H / 2

      for (const star of stars) {
        star.pz = star.z
        star.z -= speed

        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * W * 3
          star.y = (Math.random() - 0.5) * H * 3
          star.z = W
          star.pz = star.z
        }

        const sx  = (star.x / star.z)  * FOCAL + cx
        const sy  = (star.y / star.z)  * FOCAL + cy
        const spx = (star.x / star.pz) * FOCAL + cx
        const spy = (star.y / star.pz) * FOCAL + cy

        // skip stars outside screen
        if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue

        const size  = Math.max(0.4, (1 - star.z / W) * 3.2)
        const alpha = Math.min(1, (1 - star.z / W) * 1.6)
        const t     = 1 - star.z / W
        const r     = Math.round(160 + t * 95)
        const g     = Math.round(130 + t * 125)
        const b     = 255

        ctx.beginPath()
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.lineWidth = size
        ctx.moveTo(spx, spy)
        ctx.lineTo(sx, sy)
        ctx.stroke()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    // Speed up on scroll
    const onScroll = () => {
      speed = 4 + window.scrollY * 0.012
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    // Resize
    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W
      canvas.height = H
      initStars()
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.95 }}
    />
  )
}

// ── Count-up hook ──────────────────────────────────────────────────────────
function useCountUp(target: number, active: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    const dur = 2000
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

// Countdown
const SALE_END = new Date("2026-05-16T23:59:00+08:00")
function useCountdown(end: Date) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    function tick() {
      const diff = Math.max(0, end.getTime() - Date.now())
      setT({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [end])
  return t
}

// ── Sub-components (hooks can't be in .map callbacks) ─────────────────────
type FeatureDef = { icon: ElementType; title: string; desc: string; large: boolean }
function FeatureCard({ f, index }: { f: FeatureDef; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  const Icon = f.icon
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: (index % 3) * 0.08 }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className={cn("group rounded-3xl border border-white/[0.07] p-7 sm:p-8 cursor-default transition-colors duration-300 hover:border-indigo-500/30 hover:bg-indigo-500/[0.03]", f.large ? "lg:col-span-2" : "")}
      style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl mb-6 border border-white/[0.08] group-hover:border-indigo-500/30 transition-colors"
        style={{ background: "rgba(99,102,241,0.08)" }}>
        <Icon className="size-6 text-indigo-400" />
      </div>
      <h3 className="text-xl font-bold mb-3">{f.title}</h3>
      <p className="text-white/65 leading-relaxed">{f.desc}</p>
    </motion.div>
  )
}

type StepDef = { num: string; icon: ElementType; title: string; desc: string }
function StepCard({ step, index }: { step: StepDef; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  const Icon = step.icon
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: index * 0.13 }}
      className="flex flex-col items-center text-center p-8 rounded-3xl border border-white/[0.06]"
      style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="relative mb-6">
        <div className="flex size-20 items-center justify-center rounded-2xl border border-white/[0.08]"
          style={{ background: "rgba(99,102,241,0.08)" }}>
          <Icon className="size-8 text-indigo-400" />
        </div>
        <span className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full text-xs font-black text-white"
          style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
          {step.num}
        </span>
      </div>
      <h3 className="text-lg font-bold mb-2">{step.title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
    </motion.div>
  )
}

type StatDef = { value: number; suffix: string; label: string }
const STAT_GRADIENTS = [
  "linear-gradient(135deg,#818cf8,#a78bfa)",
  "linear-gradient(135deg,#a78bfa,#c084fc)",
  "linear-gradient(135deg,#c084fc,#e879f9)",
]
function StatCard({ s, index, active }: { s: StatDef; index: number; active: boolean }) {
  const val = useCountUp(s.value, active)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={active ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
      style={{ background: "#0d0d1a" }}>
      <div className="text-[clamp(3rem,7vw,5.5rem)] font-black leading-none mb-3"
        style={{ background: STAT_GRADIENTS[index], WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
        {val.toLocaleString()}{s.suffix}
      </div>
      <div className="text-sm text-white/60 font-medium tracking-wide">{s.label}</div>
    </motion.div>
  )
}

// ── Scroll-reveal wrapper ─────────────────────────────────────────────────
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: delay / 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const statsInView = useInView(statsRef, { once: true, margin: "-80px" })
  const countdown = useCountdown(SALE_END)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", h, { passive: true })
    return () => window.removeEventListener("scroll", h)
  }, [])

  return (
    <div className="bg-[#07070e] text-white min-h-screen font-sans antialiased overflow-x-hidden" suppressHydrationWarning>
      <style>{`
        @keyframes marquee   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes pulse-dot { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes bob-slow  { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-12px) rotate(1deg)} }
        @keyframes scroll-hint { 0%,100%{opacity:.2;transform:translateY(0)} 50%{opacity:.6;transform:translateY(5px)} }
        .marquee-inner { display:flex; gap:.75rem; width:max-content; animation:marquee 30s linear infinite; }
        .marquee-inner:hover { animation-play-state:paused }
      `}</style>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <header className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "bg-[#07070e]/80 backdrop-blur-2xl border-b border-white/[0.06]" : "bg-transparent"
      )}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8 h-20">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Zuu Academy" width={44} height={44} className="h-11 w-11 rounded-xl object-cover" priority />
            <span className="font-extrabold text-xl tracking-tight">Zuu Academy</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="px-5 h-10 flex items-center text-sm font-medium text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/5">
              Нэвтрэх
            </Link>
            <Link href="/register" className="px-5 h-10 flex items-center text-sm font-bold bg-white text-[#07070e] rounded-xl hover:bg-white/90 transition-all shadow-lg shadow-white/10 hover:scale-[1.03] gap-1.5">
              Бүртгүүлэх <ArrowRight className="size-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 sm:px-8 pt-20 pb-16 overflow-hidden">
        {/* Star tunnel canvas */}
        <StarTunnel />

        {/* Radial vignette so text stays readable */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, #07070e 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: "linear-gradient(to top, #07070e, transparent)" }} />

        {/* Content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-5 py-2 mb-10 text-sm font-semibold text-indigo-300 tracking-wide uppercase"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <span className="size-2 rounded-full bg-indigo-400" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
            ЭЕШ-д бэлтгэх №1 платформ
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="text-[clamp(4rem,13vw,9rem)] font-black tracking-tight leading-[0.9] mb-8"
          >
            <span className="block text-white drop-shadow-2xl">Ирээдүйгээ</span>
            <span className="block" style={{
              background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 45%, #e879f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 40px rgba(139,92,246,0.5))",
            }}>
              бүтээ
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
            className="text-[clamp(1rem,2.5vw,1.3rem)] text-white/40 max-w-xl mx-auto mb-12 leading-relaxed font-light"
          >
            Мэргэжлийн багш нарын blueprint дагуу бэлтгэгдсэн шалгалтуудаар
            дадлагажиж, дүнгийн задаргаагаар алдаагаа засаарай.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.34 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/register"
              className="flex items-center gap-2 px-8 h-14 rounded-2xl bg-white text-[#07070e] font-bold text-base hover:bg-white/90 transition-all shadow-2xl shadow-white/10 hover:scale-[1.04] hover:shadow-white/20">
              Үнэгүй эхлэх <ArrowRight className="size-4" />
            </Link>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 px-8 h-14 rounded-2xl border border-white/10 text-white/55 hover:text-white hover:border-white/25 hover:bg-white/[0.04] font-medium text-base transition-all cursor-pointer">
              Дэлгэрэнгүй <ChevronDown className="size-4" />
            </button>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.55 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-14"
          >
            {[
              { n: "1,200+", t: "Шалгалт өгсөн" },
              { n: "50+",    t: "Шалгалтын сан" },
              { n: "800",    t: "Дээд оноо" },
            ].map((s, i) => (
              <motion.div key={s.t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }} className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">{s.n}</div>
                <div className="text-xs text-white/30 mt-1 tracking-wide">{s.t}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ animation: "scroll-hint 2s ease-in-out infinite" }}>
          <ChevronDown className="size-5 text-white/25" />
        </div>
      </section>

      {/* ── SUBJECTS MARQUEE ────────────────────────────────────────────── */}
      <div className="py-10 overflow-hidden border-y border-white/[0.05]" style={{ background: "rgba(255,255,255,0.012)" }}>
        <div className="marquee-inner">
          {[...SUBJECTS, ...SUBJECTS, ...SUBJECTS, ...SUBJECTS].map((s, i) => (
            <div key={i} className="shrink-0 flex items-center gap-3 px-6 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-2xl leading-none">{s.emoji}</span>
              <span className="text-base font-bold text-white/80 whitespace-nowrap">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section className="py-28 px-5 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 mb-4">Тоо баримт</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              Нотлогдсон{" "}
              <span style={{ background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                үр дүн
              </span>
            </h2>
          </Reveal>

          <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-3xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.07)" }}>
            {STATS.map((s, i) => <StatCard key={s.label} s={s} index={i} active={statsInView} />)}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-5 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 mb-4">Яагаад Zuu Academy?</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              Хамгийн{" "}
              <span style={{ background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                ухаалаг
              </span>{" "}бэлтгэл
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => <FeatureCard key={f.title} f={f} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="py-28 px-5 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center mb-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 mb-4">Процесс</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">3 алхамаар эхэлье</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            <div className="hidden md:block absolute top-16 left-[33%] right-[33%] h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)" }} />
            {STEPS.map((step, i) => <StepCard key={step.num} step={step} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-5 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 mb-4">Үнэ тариф</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Ямар ч subscription үгүй</h2>
            <p className="text-white/60 text-lg">Хэрэгтэй шалгалтаа л ав</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free */}
            <Reveal delay={0}>
              <div className="h-full flex flex-col rounded-3xl border border-white/[0.07] p-8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Үнэгүй</p>
                <div className="flex items-end gap-1 mb-8"><span className="text-5xl font-black">0</span><span className="text-xl font-bold text-white/60 mb-1.5">₮</span></div>
                <ul className="space-y-3 flex-1 mb-8">
                  {["Өмнөх жилийн ЭЕШ материалууд","Хязгаарлагдмал шалгалтууд","Үндсэн дүн шинжилгээ"].map(t => (
                    <li key={t} className="flex items-start gap-3 text-sm text-white/65"><Check className="size-4 text-white/20 mt-0.5 shrink-0"/>{t}</li>
                  ))}
                </ul>
                <Link href="/register" className="flex items-center justify-center h-12 rounded-2xl border border-white/10 text-white/45 hover:text-white hover:border-white/20 hover:bg-white/[0.04] font-semibold text-sm transition-all">Эхлэх</Link>
              </div>
            </Reveal>

            {/* Popular */}
            <Reveal delay={100}>
              <div className="relative h-full">
                <div className="absolute -inset-[1px] rounded-3xl" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", opacity: 0.6 }} />
                <div className="relative h-full flex flex-col rounded-3xl p-8" style={{ background: "#0e0e1d" }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Нэг шалгалт</p>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Алдартай</span>
                  </div>
                  <div className="flex items-end gap-1 mb-2"><span className="text-5xl font-black">1,000</span><span className="text-xl font-bold text-white/45 mb-1.5">₮</span></div>
                  <p className="text-white/30 text-xs mb-8">Bundle: 10 шалгалт = <span className="text-indigo-400 font-semibold">6,900₮</span></p>
                  <ul className="space-y-3 flex-1 mb-8">
                    {["Бүх хичээлийн шалгалтууд","Дэлгэрэнгүй дүн шинжилгээ","Сэдвийн задаргаа + rank","Тайлбартай зөв хариулт"].map(t => (
                      <li key={t} className="flex items-start gap-3 text-sm text-white/70"><Check className="size-4 text-indigo-400 mt-0.5 shrink-0"/>{t}</li>
                    ))}
                  </ul>
                  <Link href="/register" className="flex items-center justify-center gap-2 h-12 rounded-2xl font-bold text-sm text-white hover:opacity-90 hover:scale-[1.02] transition-all"
                    style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                    Шалгалт авах <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Season */}
            <Reveal delay={200}>
              <div className="h-full flex flex-col rounded-3xl border border-white/[0.07] p-8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Бүтэн улирал</p>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25">-50%</span>
                </div>
                <div className="flex items-end gap-1 mb-2"><span className="text-xl font-bold text-white/20 line-through mb-0">50,000₮</span></div>
                <div className="flex items-end gap-1 mb-2"><span className="text-5xl font-black">24,900</span><span className="text-xl font-bold text-white/60 mb-1.5">₮</span></div>
                <p className="text-[11px] text-rose-400/70 font-medium mb-8">⏱ {countdown.d}хоног {String(countdown.h).padStart(2,"0")}:{String(countdown.m).padStart(2,"0")}:{String(countdown.s).padStart(2,"0")} үлдсэн</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {["Нэг хичээлийн бүх материал","Хязгааргүй хэрэглээ","Давтагдашгүй үнэ","Бүх дүн шинжилгээ"].map(t => (
                    <li key={t} className="flex items-start gap-3 text-sm text-white/65"><Check className="size-4 text-violet-400/50 mt-0.5 shrink-0"/>{t}</li>
                  ))}
                </ul>
                <Link href="/register" className="flex items-center justify-center h-12 rounded-2xl border border-white/10 text-white/45 hover:text-white hover:border-white/20 hover:bg-white/[0.04] font-semibold text-sm transition-all">Авах</Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-5 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <div className="relative rounded-[2.5rem] overflow-hidden px-8 py-24 text-center"
              style={{ background: "linear-gradient(135deg,#0f0f2e 0%,#130d2e 50%,#0a0a1e 100%)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 70%)" }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-indigo-500/[0.08] pointer-events-none"
                style={{ animation: "spin-slow 25s linear infinite" }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-violet-500/[0.07] pointer-events-none"
                style={{ animation: "spin-slow 18s linear infinite reverse" }} />
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/60 mb-5">Өнөөдрөөс эхэл</p>
                <h2 className="text-[clamp(2.5rem,7vw,5rem)] font-black tracking-tight leading-tight mb-6">
                  Ирээдүйгээ<br />
                  <span style={{ background: "linear-gradient(135deg,#818cf8,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 30px rgba(139,92,246,0.4))" }}>
                    бүтээ
                  </span>
                </h2>
                <p className="text-white/60 text-lg mb-10 max-w-sm mx-auto leading-relaxed">
                  Бүртгэл үнэгүй. Нэмэлт мэдээлэл шаардлагагүй. 30 секундэд бэлэн.
                </p>
                <Link href="/register"
                  className="inline-flex items-center gap-2.5 px-10 h-14 rounded-2xl font-bold text-base text-[#07070e] bg-white hover:bg-white/92 transition-all shadow-2xl shadow-white/15 hover:scale-[1.04] hover:shadow-white/25">
                  Үнэгүй бүртгүүлэх <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-14 px-5 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.png" alt="Zuu Academy" width={36} height={36} className="h-9 w-9 rounded-xl object-cover" />
              <span className="font-extrabold text-lg tracking-tight">Zuu Academy</span>
            </Link>
            <p className="text-xs text-white/18 pl-12">Ирээдүйгээ бүтээ</p>
          </div>
          <nav className="flex items-center gap-8">
            <Link href="/login"    className="text-sm text-white/28 hover:text-white/70 transition-colors">Нэвтрэх</Link>
            <Link href="/register" className="text-sm text-white/28 hover:text-white/70 transition-colors">Бүртгүүлэх</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl mt-10 pt-8 border-t border-white/[0.04] text-center">
          <p className="text-xs text-white/14">© 2026 Zuu Academy · Бүх эрх хуулиар хамгаалагдсан.</p>
        </div>
      </footer>
    </div>
  )
}

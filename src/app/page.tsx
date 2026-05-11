"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Check, ChevronDown, Trophy, BarChart3, Zap, BookOpen, DollarSign, Target } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Subjects marquee data ──────────────────────────────────────────────────
const SUBJECTS = [
  { name: "Математик",    emoji: "📐", color: "from-orange-400 to-amber-500" },
  { name: "Англи хэл",   emoji: "🇬🇧", color: "from-sky-400 to-blue-500" },
  { name: "Монгол хэл",  emoji: "🇲🇳", color: "from-emerald-400 to-teal-500" },
  { name: "Биологи",     emoji: "🧬", color: "from-violet-400 to-purple-500" },
  { name: "Газарзүй",    emoji: "🗺️", color: "from-yellow-400 to-orange-400" },
  { name: "Физик",       emoji: "⚡", color: "from-blue-500 to-indigo-600" },
  { name: "Хими",        emoji: "🧪", color: "from-pink-400 to-rose-500" },
  { name: "Түүх",        emoji: "📜", color: "from-amber-400 to-yellow-500" },
  { name: "Нийгэм",      emoji: "🌍", color: "from-cyan-400 to-sky-500" },
]

const FEATURES = [
  { icon: Trophy,       title: "Blueprint шалгалтууд",  desc: "Мэргэжлийн багш нарын ЭЕШ-ийн blueprint дагуу хийгдсэн 100% бодит нийцтэй шалгалтууд.", large: true  },
  { icon: BarChart3,    title: "Дэлгэрэнгүй шинжилгээ", desc: "Сэдэв бүрээр задаргаа авч нийт сурагчидтай rank харьцуулагд.",                          large: false },
  { icon: Zap,          title: "Шинэ шалгалт байнга",   desc: "Тогтмол шинэчлэгддэг контент. Шинэ шалгалт байнга нэмэгдэнэ.",                          large: false },
  { icon: BookOpen,     title: "Үнэгүй материалууд",    desc: "Өмнөх жилийн ЭЕШ болон дасгалуудыг бүрэн үнэгүйгээр ашиглаарай.",                       large: true  },
  { icon: DollarSign,   title: "Хамгийн хямд үнэ",      desc: "1 шалгалт = ердөө 1,000₮. Subscription шаардлагагүй, хэзээ ч цуцлах боломжтой.",         large: true  },
  { icon: Target,       title: "Бүх хичээлийн ЭЕШ",    desc: "Математик, Англи хэл, Газарзүй болон бусад бүх хичээлийн шалгалт нэг дороос.",            large: false },
]

const STATS = [
  { value: 1200, suffix: "+", label: "Шалгалт өгсөн" },
  { value: 50,   suffix: "+", label: "Шалгалтын сан" },
  { value: 800,  suffix: "",  label: "Дээд оноо авсан" },
]

const STEPS = [
  { num: "01", icon: Target,    title: "Бүртгүүлэх",      desc: "И-мэйлээрээ 30 секундэд бүртгэл үүсгэ. Нэмэлт мэдээлэл шаардлагагүй." },
  { num: "02", icon: BookOpen,  title: "Шалгалт сонгох",   desc: "Хичээл, жил, түвшингээр шүүгээд өөрт тохирох шалгалтыг сонго." },
  { num: "03", icon: BarChart3, title: "Дүнгээ шинжлэх",   desc: "Хаана алдаж байгааг мэд, rank харж бэлтгэлээ нарийвчил." },
]

// ── Hooks ─────────────────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView] as const
}

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

const SALE_END = new Date("2026-06-01T23:59:00+08:00")
function useCountdown(end: Date) {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 })
  useEffect(() => {
    function tick() {
      const diff = Math.max(0, end.getTime() - Date.now())
      setT({ h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [end])
  return t
}

// ── Components ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(36px)",
      transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// Slot-machine style digit column
function SlotDigit({ digit, active }: { digit: number; active: boolean }) {
  return (
    <span className="inline-block overflow-hidden" style={{ height: "1.15em", verticalAlign: "bottom" }}>
      <span className="flex flex-col" style={{
        transform: active ? `translateY(-${digit * 10}%)` : "translateY(0%)",
        transition: active ? "transform 1.4s cubic-bezier(0.22,1,0.36,1)" : "none",
      }}>
        {[0,1,2,3,4,5,6,7,8,9].map(n => (
          <span key={n} className="block" style={{ height: "1.15em", lineHeight: "1.15em" }}>{n}</span>
        ))}
      </span>
    </span>
  )
}

function SlotNumber({ value, suffix, active }: { value: number; suffix: string; active: boolean }) {
  const digits = String(value).split("").map(Number)
  return (
    <span className="tabular-nums">
      {digits.map((d, i) => <SlotDigit key={i} digit={d} active={active} />)}
      {suffix}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [statsRef, statsInView] = useInView(0.3)
  const countdown = useCountdown(SALE_END)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", h, { passive: true })
    return () => window.removeEventListener("scroll", h)
  }, [])

  return (
    <div className="bg-[#07070e] text-white min-h-screen font-sans antialiased overflow-x-hidden" suppressHydrationWarning>
      <style>{`
        @keyframes marquee  { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes pulse-glow { 0%,100% { opacity:.4 } 50% { opacity:.9 } }
        @keyframes bob { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }
        @keyframes bob-slow { 0%,100% { transform:translateY(0) rotate(-2deg) } 50% { transform:translateY(-14px) rotate(2deg) } }
        @keyframes spin-slow { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes scroll-hint { 0%,100%{opacity:.3;transform:translateY(0)} 50%{opacity:.7;transform:translateY(6px)} }
        .marquee-track { display:flex; gap:1rem; animation: marquee 28s linear infinite; width:max-content }
        .marquee-track:hover { animation-play-state:paused }
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
            <Link href="/register" className="px-5 h-10 flex items-center text-sm font-semibold bg-white text-[#07070e] rounded-xl hover:bg-white/90 transition-all shadow-lg shadow-white/10 hover:scale-[1.02]">
              Бүртгүүлэх <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 sm:px-8 pt-24 pb-16 overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)" }} />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)", animation: "bob-slow 8s ease-in-out infinite" }} />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", animation: "bob-slow 6s ease-in-out 2s infinite" }} />

        {/* Dot grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-5 py-2 mb-10 text-sm font-semibold text-indigo-300 tracking-wide uppercase"
            style={{ backdropFilter: "blur(12px)" }}>
            <span className="size-2 rounded-full bg-indigo-400" style={{ animation: "pulse-glow 2s ease-in-out infinite" }} />
            ЭЕШ-д бэлтгэх №1 платформ
          </div>

          {/* Main headline */}
          <h1 className="text-[clamp(3.5rem,12vw,8rem)] font-black tracking-tight leading-[0.95] mb-8">
            <span className="block text-white">ЭЕШ-д</span>
            <span className="block" style={{
              background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 40%, #c084fc 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              тэнцэ
            </span>
          </h1>

          <p className="text-[clamp(1rem,2.5vw,1.35rem)] text-white/40 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            Мэргэжлийн багш нарын blueprint дагуу бэлтгэгдсэн шалгалтуудаар
            дадлагажиж, дүнгийн задаргаагаар алдаагаа засаарай.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"
              className="flex items-center gap-2 px-8 h-14 rounded-2xl bg-white text-[#07070e] font-bold text-base hover:bg-white/90 transition-all shadow-2xl shadow-white/10 hover:scale-[1.03] hover:shadow-white/20">
              Үнэгүй эхлэх
              <ArrowRight className="size-4" />
            </Link>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 px-8 h-14 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.04] font-medium text-base transition-all cursor-pointer">
              Дэлгэрэнгүй
              <ChevronDown className="size-4" />
            </button>
          </div>

          {/* Mini stats under hero */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {[
              { n: "1,200+", t: "Шалгалт өгсөн" },
              { n: "50+",    t: "Шалгалтын сан" },
              { n: "800",    t: "Дээд оноо" },
            ].map(s => (
              <div key={s.t} className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">{s.n}</div>
                <div className="text-xs text-white/30 mt-1 tracking-wide">{s.t}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ animation: "scroll-hint 2s ease-in-out infinite" }}>
          <ChevronDown className="size-5 text-white/20" />
        </div>
      </section>

      {/* ── SUBJECTS MARQUEE ────────────────────────────────────────────── */}
      <div className="py-10 overflow-hidden border-y border-white/[0.05]" style={{ background: "rgba(255,255,255,0.015)" }}>
        <div className="marquee-track">
          {[...SUBJECTS, ...SUBJECTS, ...SUBJECTS, ...SUBJECTS].map((s, i) => (
            <div key={i} className={`shrink-0 flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r ${s.color} bg-opacity-10`}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-2xl">{s.emoji}</span>
              <span className="text-base font-bold text-white whitespace-nowrap">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section className="py-28 px-5 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/70 mb-4">Тоо баримт</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              Зуу-гийн <span style={{ background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>нотлогдсон</span> үр дүн
            </h2>
          </Reveal>
          <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.06] rounded-3xl overflow-hidden">
            {STATS.map((s, i) => (
              <div key={s.label} className="flex flex-col items-center justify-center py-14 px-8 text-center"
                style={{ background: "#0d0d1a" }}>
                <div className="text-[clamp(3rem,7vw,5.5rem)] font-black leading-none mb-3"
                  style={{ background: ["linear-gradient(135deg,#818cf8,#a78bfa)", "linear-gradient(135deg,#a78bfa,#c084fc)", "linear-gradient(135deg,#c084fc,#e879f9)"][i], WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  <SlotNumber value={s.value} suffix={s.suffix} active={statsInView} />
                </div>
                <div className="text-sm text-white/35 font-medium tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES BENTO ──────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-5 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/70 mb-4">Яагаад Zuu Academy?</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              Хамгийн <span style={{ background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>ухаалаг</span> бэлтгэл
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <Reveal key={f.title} delay={i * 80} className={cn(f.large ? "lg:col-span-2" : "")}>
                  <div className="group h-full rounded-3xl border border-white/[0.07] p-7 sm:p-8 transition-all duration-300 cursor-default hover:border-indigo-500/30 hover:bg-indigo-500/[0.03]"
                    style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl mb-6 border border-white/[0.08] transition-all duration-300 group-hover:border-indigo-500/30"
                      style={{ background: "rgba(99,102,241,0.08)" }}>
                      <Icon className="size-6 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white/90">{f.title}</h3>
                    <p className="text-white/38 leading-relaxed">{f.desc}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="py-28 px-5 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center mb-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/70 mb-4">Процесс</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">3 алхамаар эхэлье</h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 relative">
            {/* connector lines */}
            <div className="hidden md:block absolute top-16 left-[33%] right-[33%] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)" }} />
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <Reveal key={step.num} delay={i * 120}>
                  <div className="relative flex flex-col items-center text-center p-8 rounded-3xl border border-white/[0.06]"
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
                    <p className="text-white/35 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-5 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/70 mb-4">Үнэ тариф</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Ямар ч subscription үгүй</h2>
            <p className="text-white/35 text-lg">Хэрэгтэй шалгалтаа л ав</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free */}
            <Reveal delay={0}>
              <div className="h-full flex flex-col rounded-3xl border border-white/[0.07] p-8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Үнэгүй</p>
                <div className="flex items-end gap-1 mb-8">
                  <span className="text-5xl font-black">0</span>
                  <span className="text-xl font-bold text-white/40 mb-1.5">₮</span>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {["Өмнөх жилийн ЭЕШ материалууд", "Хязгаарлагдмал шалгалтууд", "Үндсэн дүн шинжилгээ"].map(t => (
                    <li key={t} className="flex items-start gap-3 text-sm text-white/40">
                      <Check className="size-4 text-white/20 mt-0.5 shrink-0" />{t}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="flex items-center justify-center h-12 rounded-2xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 hover:bg-white/[0.04] font-semibold text-sm transition-all">
                  Эхлэх
                </Link>
              </div>
            </Reveal>

            {/* Popular */}
            <Reveal delay={100}>
              <div className="relative h-full">
                <div className="absolute -inset-[1px] rounded-3xl" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", opacity: 0.5 }} />
                <div className="relative h-full flex flex-col rounded-3xl p-8" style={{ background: "#0e0e1d" }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Нэг шалгалт</p>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Алдартай</span>
                  </div>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-5xl font-black">1,000</span>
                    <span className="text-xl font-bold text-white/50 mb-1.5">₮</span>
                  </div>
                  <p className="text-white/35 text-xs mb-8">Bundle: 10 шалгалт = <span className="text-indigo-400 font-semibold">6,900₮</span></p>
                  <ul className="space-y-3 flex-1 mb-8">
                    {["Бүх хичээлийн шалгалтууд", "Дэлгэрэнгүй дүн шинжилгээ", "Сэдвийн задаргаа + rank", "Тайлбартай зөв хариулт"].map(t => (
                      <li key={t} className="flex items-start gap-3 text-sm text-white/70">
                        <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />{t}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="flex items-center justify-center gap-2 h-12 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90 hover:scale-[1.02]"
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
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-base font-bold text-white/20 line-through">50,000₮</span>
                </div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-5xl font-black">24,900</span>
                  <span className="text-xl font-bold text-white/40 mb-1.5">₮</span>
                </div>
                <p className="text-[11px] text-rose-400/70 font-medium mb-8">
                  ⏱ {String(countdown.h).padStart(2,"0")}:{String(countdown.m).padStart(2,"0")}:{String(countdown.s).padStart(2,"0")} үлдсэн
                </p>
                <ul className="space-y-3 flex-1 mb-8">
                  {["Нэг хичээлийн бүх материал", "Хязгааргүй хэрэглээ", "Давтагдашгүй үнэ", "Бүх дүн шинжилгээ"].map(t => (
                    <li key={t} className="flex items-start gap-3 text-sm text-white/40">
                      <Check className="size-4 text-violet-400/50 mt-0.5 shrink-0" />{t}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="flex items-center justify-center h-12 rounded-2xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 hover:bg-white/[0.04] font-semibold text-sm transition-all">
                  Авах
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="py-24 px-5 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <div className="relative rounded-[2rem] overflow-hidden px-8 py-20 text-center"
              style={{ background: "linear-gradient(135deg, #0f0f2e 0%, #130d2e 50%, #0a0a1e 100%)", border: "1px solid rgba(99,102,241,0.2)" }}>
              {/* glow */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)" }} />
              {/* rotating ring */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-indigo-500/10 pointer-events-none"
                style={{ animation: "spin-slow 20s linear infinite" }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full border border-indigo-500/8 pointer-events-none"
                style={{ animation: "spin-slow 14s linear infinite reverse" }} />

              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/70 mb-5">Өнөөдрөөс эхэл</p>
                <h2 className="text-[clamp(2.5rem,7vw,5rem)] font-black tracking-tight leading-tight mb-6">
                  Ирээдүйгээ<br />
                  <span style={{ background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    бүтээ
                  </span>
                </h2>
                <p className="text-white/40 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                  Бүртгэл үнэгүй. Нэмэлт мэдээлэл шаардлагагүй. 30 секундэд бэлэн.
                </p>
                <Link href="/register"
                  className="inline-flex items-center gap-2.5 px-10 h-14 rounded-2xl font-bold text-base text-[#07070e] bg-white hover:bg-white/90 transition-all shadow-2xl shadow-white/15 hover:scale-[1.03] hover:shadow-white/25">
                  Үнэгүй бүртгүүлэх
                  <ArrowRight className="size-4" />
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
            <p className="text-xs text-white/20 pl-12">Ирээдүйгээ бүтээ</p>
          </div>
          <nav className="flex items-center gap-8">
            <Link href="/login"  className="text-sm text-white/30 hover:text-white/70 transition-colors">Нэвтрэх</Link>
            <Link href="/register" className="text-sm text-white/30 hover:text-white/70 transition-colors">Бүртгүүлэх</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl mt-10 pt-8 border-t border-white/[0.04] text-center">
          <p className="text-xs text-white/15">© 2026 Zuu Academy · Бүх эрх хуулиар хамгаалагдсан.</p>
        </div>
      </footer>

    </div>
  )
}

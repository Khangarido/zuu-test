"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ShoppingCart, Play, ArrowRight, Loader2, RotateCcw, CheckCircle,
} from "lucide-react"
import { resolveExamColors, type ExamCardColors } from "@/lib/exam-card-colors"

const TEXT = "#B03060"
const TEXT_MUTED = "#C06080"
const ACCENT = "#D63A6B"

function formatMnt(n: number) {
  return new Intl.NumberFormat("mn-MN").format(n) + "₮"
}

function BubbleGrid({ color2 }: { color2: string }) {
  const xs = [8, 24, 40, 56]
  const ys = [6, 18, 30, 42, 54]
  const fill = `${color2}66`
  const stroke = `${color2}66`
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" aria-hidden="true" style={{ flexShrink: 0 }}>
      {ys.flatMap((y) =>
        xs.map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={4} fill={fill} stroke={stroke} strokeWidth={1} />
        ))
      )}
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="2" width="13" height="18" rx="2" stroke={ACCENT} strokeWidth="1.5" fill={`${ACCENT}1A`} />
      <path d="M7 8h7M7 11h5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="15" r="1" fill={ACCENT} />
      <circle cx="10.5" cy="15" r="1" fill={ACCENT} />
      <circle cx="14" cy="15" r="1" fill={ACCENT} />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={TEXT_MUTED} strokeWidth="1.5" />
      <path d="M12 7v5l3 3" stroke={TEXT_MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function OmrScoreRing({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const deg = pct * 3.6
  const fill = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444"
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: `2px solid ${ACCENT}`,
        background: `conic-gradient(${fill} ${deg}deg, rgba(244,167,192,0.3) ${deg}deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#FFF5F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: TEXT,
          fontFamily: "var(--font-baloo2), 'Baloo 2', sans-serif",
        }}
      >
        {score.toFixed(0)}
      </div>
    </div>
  )
}

function OmrWrapper({
  colors,
  children,
}: {
  colors: ReturnType<typeof resolveExamColors>
  children: ReactNode
}) {
  return (
    <div className="omr-wrapper">
      <div className="omr-layer-2" aria-hidden="true" style={{ background: colors.layer2 }} />
      <div className="omr-layer-1" aria-hidden="true" style={{ background: colors.layer1 }} />
      {children}
    </div>
  )
}

function OmrCard({
  colors,
  children,
}: {
  colors: ReturnType<typeof resolveExamColors>
  children: ReactNode
}) {
  return (
    <div
      className="omr-card"
      style={{
        background: colors.gradient,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div className="omr-punch-holes" aria-hidden="true">
        <div className="omr-punch-hole" />
        <div className="omr-punch-hole" />
        <div className="omr-punch-hole" />
      </div>
      {children}
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
        setError(json.error ?? "Алдаа гарлаа.")
        setLoading(false)
        return
      }
      setRedirecting(true)
      await new Promise((r) => setTimeout(r, 80))
      window.location.href = json.url
    } catch {
      setError("Сүлжээний алдаа гарлаа.")
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-1">
      <button onClick={handleBuy} disabled={loading || redirecting} className="omr-btn">
        {loading || redirecting ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            {redirecting ? "Шилжиж байна..." : "Нэхэмжлэл..."}
          </>
        ) : (
          <>
            <ShoppingCart className="size-3.5" />
            Худалдаж авах
          </>
        )}
      </button>
      {error && <p className="text-xs text-center text-rose-500">{error}</p>}
    </div>
  )
}

export type OwnedExamCard = ExamCardColors & {
  id: string
  title: string
  duration_minutes: number
  lastAttemptId: string | null
  lastScore: number | null
}

export type AvailableExamCard = ExamCardColors & {
  id: string
  title: string
  duration_minutes: number
  price: number
  is_new: boolean
  is_recommended: boolean
  hasAccess?: boolean
}

export type HistoryExamCard = ExamCardColors & {
  id: string
  examTitle: string
  score: number
  submittedAt: string | null
}

export function OwnedOmrCard({ exam }: { exam: OwnedExamCard }) {
  const colors = resolveExamColors(exam)
  return (
    <OmrWrapper colors={colors}>
      <OmrCard colors={colors}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <DocIcon />
          {exam.lastScore !== null && <OmrScoreRing score={exam.lastScore} />}
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: TEXT, margin: 0, lineHeight: 1.35 }}>
          {exam.title}
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <ClockIcon />
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>{exam.duration_minutes} минут</span>
          </div>
          <BubbleGrid color2={colors.c2} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {exam.lastAttemptId ? (
            <>
              <Link href={`/results/${exam.lastAttemptId}`} style={{ flex: 1 }}>
                <button className="omr-btn" type="button">
                  <CheckCircle className="size-3.5" />
                  Үр дүн
                </button>
              </Link>
              <Link href={`/exam/${exam.id}?retake=1`}>
                <button className="omr-btn-icon" type="button" aria-label="Дахин өгөх">
                  <RotateCcw className="size-3.5" />
                </button>
              </Link>
            </>
          ) : (
            <Link href={`/exam/${exam.id}`} style={{ width: "100%" }}>
              <button className="omr-btn" type="button">
                <Play className="size-3.5" />
                Шалгалт өгөх
              </button>
            </Link>
          )}
        </div>
      </OmrCard>
    </OmrWrapper>
  )
}

export function AvailableOmrCard({ exam }: { exam: AvailableExamCard }) {
  const colors = resolveExamColors(exam)
  const isFree = exam.price === 0
  const canStart = isFree || !!exam.hasAccess
  return (
    <OmrWrapper colors={colors}>
      <OmrCard colors={colors}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <DocIcon />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            {exam.is_new && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "white",
                  background: ACCENT,
                  borderRadius: 20,
                  padding: "2px 8px",
                  fontFamily: "var(--font-baloo2), 'Baloo 2', sans-serif",
                }}
              >
                Шинэ
              </span>
            )}
            {exam.is_recommended && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: "rgba(244,167,192,0.4)",
                  color: TEXT,
                  borderRadius: 20,
                  padding: "2px 8px",
                  fontFamily: "var(--font-baloo2), 'Baloo 2', sans-serif",
                }}
              >
                Санал
              </span>
            )}
          </div>
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: TEXT, margin: 0, lineHeight: 1.35 }}>
          {exam.title}
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <ClockIcon />
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>{exam.duration_minutes} минут</span>
            </div>
            {isFree ? (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: TEXT,
                  fontFamily: "var(--font-baloo2), 'Baloo 2', sans-serif",
                }}
              >
                Үнэгүй
              </span>
            ) : canStart ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#16a34a",
                  background: "rgba(22,163,74,0.12)",
                  borderRadius: 20,
                  padding: "2px 10px",
                  fontFamily: "var(--font-baloo2), 'Baloo 2', sans-serif",
                }}
              >
                Нээлттэй
              </span>
            ) : (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: TEXT,
                  fontFamily: "var(--font-baloo2), 'Baloo 2', sans-serif",
                }}
              >
                {formatMnt(exam.price)}
              </span>
            )}
          </div>
          <BubbleGrid color2={colors.c2} />
        </div>
        {canStart ? (
          <Link href={`/exam/${exam.id}`} style={{ width: "100%" }}>
            <button className="omr-btn" type="button">
              <Play className="size-3.5" />
              Шалгалт өгөх
            </button>
          </Link>
        ) : (
          <BuyButton examId={exam.id} />
        )}
      </OmrCard>
    </OmrWrapper>
  )
}

export function HistoryOmrCard({ attempt }: { attempt: HistoryExamCard }) {
  const colors = resolveExamColors(attempt)
  return (
    <OmrWrapper colors={colors}>
      <OmrCard colors={colors}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <DocIcon />
          <OmrScoreRing score={attempt.score} />
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: TEXT, margin: 0, lineHeight: 1.35 }}>
          {attempt.examTitle}
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <p style={{ fontSize: 12, color: TEXT_MUTED, margin: 0 }}>
            {attempt.submittedAt
              ? new Date(attempt.submittedAt).toLocaleDateString("mn-MN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "—"}
          </p>
          <BubbleGrid color2={colors.c2} />
        </div>
        <Link href={`/results/${attempt.id}`} style={{ width: "100%" }}>
          <button className="omr-btn" type="button">
            <ArrowRight className="size-3.5" />
            Дэлгэрэнгүй
          </button>
        </Link>
      </OmrCard>
    </OmrWrapper>
  )
}

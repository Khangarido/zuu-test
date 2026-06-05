"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

type Attempt = { submitted_at: string | null }

const CELL = 12
const GAP = 2
const WEEKS = 52
const MN_MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
const MN_DAY_LABELS = ["", "Да", "Лх", "Пү", "Ба", "Бс", "Ня"]

function toKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function cellColor(count: number, active: boolean) {
  if (!active) return "bg-transparent"
  if (count === 0) return "bg-muted"
  if (count === 1) return "bg-indigo-200 dark:bg-indigo-900"
  if (count === 2) return "bg-indigo-400 dark:bg-indigo-700"
  if (count === 3) return "bg-indigo-500 dark:bg-indigo-600"
  return "bg-indigo-600 dark:bg-indigo-500"
}

export function ActivityHeatmap({ attempts }: { attempts: Attempt[] }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)

  const { weeks, monthSpans, totalAttempts } = useMemo(() => {
    const countMap: Record<string, number> = {}
    let total = 0
    for (const a of attempts) {
      if (!a.submitted_at) continue
      const key = new Date(a.submitted_at).toISOString().slice(0, 10)
      countMap[key] = (countMap[key] ?? 0) + 1
      total++
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const start = new Date(today)
    start.setDate(today.getDate() - WEEKS * 7 - today.getDay())

    const weeks: Array<Array<{ date: Date; count: number; active: boolean }>> = []
    for (let w = 0; w < WEEKS; w++) {
      const week: (typeof weeks)[0] = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start)
        date.setDate(start.getDate() + w * 7 + d)
        week.push({
          date,
          count: countMap[toKey(date)] ?? 0,
          active: date <= today,
        })
      }
      weeks.push(week)
    }

    const monthSpans: { label: string; cols: number }[] = []
    let curMonth = -1
    let span = 0
    for (const week of weeks) {
      const m = week[0].date.getMonth()
      if (m !== curMonth) {
        if (span > 0) monthSpans.push({ label: `${MN_MONTHS[curMonth]}-р сар`, cols: span })
        curMonth = m
        span = 1
      } else {
        span++
      }
    }
    if (span > 0) monthSpans.push({ label: `${MN_MONTHS[curMonth]}-р сар`, cols: span })

    return { weeks, monthSpans, totalAttempts: total }
  }, [attempts])

  const colWidth = CELL + GAP
  const leftPad = 28

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div style={{ paddingLeft: leftPad, minWidth: WEEKS * colWidth + leftPad }}>
          {/* Month labels */}
          <div className="flex mb-1.5" style={{ gap: GAP }}>
            {monthSpans.map((m, i) => (
              <div
                key={i}
                style={{ width: m.cols * colWidth - GAP }}
                className="text-[10px] text-muted-foreground overflow-hidden whitespace-nowrap"
              >
                {m.cols >= 2 ? m.label : ""}
              </div>
            ))}
          </div>

          <div className="relative flex" style={{ gap: GAP }}>
            {/* Day labels */}
            <div
              className="absolute flex flex-col"
              style={{ left: -leftPad, width: leftPad - 4, gap: GAP }}
            >
              {MN_DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  style={{ height: CELL, lineHeight: `${CELL}px` }}
                  className="text-[9px] text-muted-foreground text-right pr-1"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    style={{ width: CELL, height: CELL }}
                    className={cn(
                      "rounded-sm transition-opacity",
                      cellColor(day.count, day.active),
                      day.active && "cursor-pointer hover:opacity-80"
                    )}
                    onMouseEnter={(e) => {
                      if (!day.active) return
                      setTip({
                        x: e.clientX,
                        y: e.clientY,
                        text: `${day.date.toLocaleDateString("mn-MN")}: ${day.count} шалгалт`,
                      })
                    }}
                    onMouseLeave={() => setTip(null)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
            <span>Бага</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <div
                key={n}
                style={{ width: CELL, height: CELL }}
                className={cn("rounded-sm", cellColor(n, true))}
              />
            ))}
            <span>Их</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{totalAttempts}</span> шалгалт өгсөн
      </p>

      {tip && (
        <div
          className="fixed z-50 pointer-events-none px-2 py-1 text-xs rounded-md bg-popover text-popover-foreground border shadow-md"
          style={{ left: tip.x + 10, top: tip.y - 36 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  )
}

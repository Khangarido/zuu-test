"use client"

import { useMemo, useState } from "react"

type Attempt = { submitted_at: string | null; score_percentage: number }

const CELL = 12
const GAP  = 3
const COL  = CELL + GAP
const MN_MONTHS = ["1","2","3","4","5","6","7","8","9","10","11","12"]
const MN_DAYS   = ["Ня","Да","Мя","Лх","Пү","Ба","Бя"]

function toKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function ActivityHeatmap({ attempts }: { attempts: Attempt[] }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)

  const { weeks, monthSpans } = useMemo(() => {
    const cm: Record<string, number> = {}
    for (const a of attempts) {
      if (!a.submitted_at) continue
      const key = new Date(a.submitted_at).toISOString().slice(0, 10)
      cm[key] = (cm[key] ?? 0) + 1
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Align start to Sunday, 52 full weeks back
    const start = new Date(today)
    start.setDate(today.getDate() - 52 * 7 - today.getDay())

    const weeks: Array<Array<{ date: Date; count: number; active: boolean }>> = []
    for (let w = 0; w < 53; w++) {
      const week: typeof weeks[0] = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start)
        date.setDate(start.getDate() + w * 7 + d)
        week.push({ date, count: cm[toKey(date)] ?? 0, active: date <= today })
      }
      weeks.push(week)
    }

    // Build month spans (how many columns each month occupies)
    const monthSpans: { label: string; cols: number }[] = []
    let curMonth = -1, span = 0
    for (const week of weeks) {
      const m = week[0].date.getMonth()
      if (m !== curMonth) {
        if (span > 0) monthSpans.push({ label: MN_MONTHS[curMonth] + " сар", cols: span })
        curMonth = m; span = 1
      } else { span++ }
    }
    if (span > 0) monthSpans.push({ label: MN_MONTHS[curMonth] + " сар", cols: span })

    return { weeks, monthSpans }
  }, [attempts])

  function bg(count: number, active: boolean) {
    if (!active) return "transparent"
    if (count === 0) return "var(--color-muted, #e5e7eb)"
    if (count === 1) return "#c7d2fe"   // indigo-200
    if (count === 2) return "#818cf8"   // indigo-400
    return "#4f46e5"                    // indigo-600
  }

  const LEFT = 24

  return (
    <div className="overflow-x-auto pb-1">
      <div style={{ paddingLeft: LEFT, minWidth: 53 * COL + LEFT }}>
        {/* Month labels */}
        <div className="flex mb-1">
          {monthSpans.map((m, i) => (
            <div key={i} style={{ width: m.cols * COL, minWidth: m.cols * COL }}
              className="text-[10px] text-muted-foreground overflow-hidden whitespace-nowrap">
              {m.cols >= 2 ? m.label : ""}
            </div>
          ))}
        </div>

        {/* Grid row */}
        <div className="flex" style={{ gap: 0 }}>
          {/* Day labels */}
          <div className="absolute flex flex-col" style={{ marginLeft: -LEFT, gap: GAP }}>
            {MN_DAYS.map((d, i) => (
              <div key={d} style={{ height: CELL, lineHeight: `${CELL}px`, width: LEFT - 4 }}
                className="text-[9px] text-muted-foreground text-right">
                {[1, 3, 5].includes(i) ? d : ""}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP, marginRight: GAP }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  style={{ width: CELL, height: CELL, background: bg(day.count, day.active), borderRadius: 2 }}
                  className={day.active ? "cursor-pointer hover:opacity-75 transition-opacity" : ""}
                  onMouseEnter={(e) => {
                    if (!day.active) return
                    setTip({ x: e.clientX, y: e.clientY,
                      text: `${day.date.toLocaleDateString("mn-MN")}: ${day.count} шалгалт өгсөн` })
                  }}
                  onMouseLeave={() => setTip(null)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
          <span>Бага</span>
          {[0, 1, 2, 3].map((n) => (
            <div key={n} style={{ width: CELL, height: CELL, background: bg(n, true), borderRadius: 2 }} />
          ))}
          <span>Их</span>
        </div>
      </div>

      {tip && (
        <div className="fixed z-50 pointer-events-none px-2 py-1 text-xs rounded-md bg-popover text-popover-foreground border shadow-md"
          style={{ left: tip.x + 8, top: tip.y - 38 }}>
          {tip.text}
        </div>
      )}
    </div>
  )
}

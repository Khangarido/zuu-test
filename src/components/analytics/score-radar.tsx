"use client"

import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer, Tooltip,
} from "recharts"

export type RadarScore = { label: string; value: number }

export function ScoreRadar({ scores }: { scores: RadarScore[] }) {
  if (!scores.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Шалгалтын мэдээлэл байхгүй байна
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={scores} margin={{ top: 12, right: 32, bottom: 12, left: 32 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <Radar
          dataKey="value"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.35}
          dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
        />
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(0)}%`, "Дундаж оноо"]}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(var(--popover-foreground))",
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

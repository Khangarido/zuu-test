"use client"

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts"

const PIE_COLORS = ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#22C55E", "#94A3B8"]

export function RadarChartWidget({ data }: { data: { axis: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
        <PolarGrid stroke="hsl(var(--border))" gridType="polygon" />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <Radar
          dataKey="value"
          stroke="#6366F1"
          fill="url(#radarGradient)"
          fillOpacity={0.4}
          dot={{ r: 3, fill: "#6366F1", strokeWidth: 0 }}
        />
        <defs>
          <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(0)}`, ""]}
          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function PieChartWidget({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value} удаа`, name]}
          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
        />
        <Legend
          verticalAlign="bottom"
          formatter={(value, entry) => {
            const count = (entry.payload as { value?: number })?.value ?? 0
            return `${value} (${count})`
          }}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

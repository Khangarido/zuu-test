import { Trophy, Target, TrendingUp, Flame } from "lucide-react"

type Props = {
  total: number
  avg: number | null
  best: number | null
  streak: number
}

export function StatsRow({ total, avg, best, streak }: Props) {
  const items = [
    { icon: Target,    color: "text-indigo-500",  label: "Нийт шалгалт",     value: String(total) },
    { icon: TrendingUp,color: "text-violet-500",  label: "Дундаж оноо",       value: avg  != null ? `${avg.toFixed(0)}%`  : "—" },
    { icon: Trophy,    color: "text-amber-500",   label: "Хамгийн өндөр",     value: best != null ? `${best.toFixed(0)}%` : "—" },
    { icon: Flame,     color: "text-orange-500",  label: "Streak",            value: streak > 0 ? `${streak} өдөр`       : "—" },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((s) => (
        <div key={s.label} className="rounded-2xl border bg-card p-4 text-center space-y-1">
          <s.icon className={`size-4 mx-auto ${s.color}`} />
          <div className="text-2xl font-bold tracking-tight">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

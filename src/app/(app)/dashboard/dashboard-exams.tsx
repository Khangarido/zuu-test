"use client"

import { useState, useMemo, type ReactNode } from "react"
import { BookOpen, ShoppingCart, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  OwnedOmrCard,
  AvailableOmrCard,
  HistoryOmrCard,
  type OwnedExamCard,
  type AvailableExamCard,
  type HistoryExamCard,
} from "@/components/exam-omr-card"

type Tab = "owned" | "available" | "history"

export function DashboardExamsSection({
  owned,
  available,
  history,
}: {
  owned: OwnedExamCard[]
  available: AvailableExamCard[]
  history: HistoryExamCard[]
}) {
  const [tab, setTab] = useState<Tab>(owned.length > 0 ? "owned" : "available")

  const tabs: { id: Tab; label: string; count: number; icon: ReactNode }[] = [
    { id: "owned", label: "Миний шалгалт", count: owned.length, icon: <BookOpen className="size-4" /> },
    { id: "available", label: "Нээлтэй", count: available.length, icon: <ShoppingCart className="size-4" /> },
    { id: "history", label: "Өгсөн", count: history.length, icon: <Trophy className="size-4" /> },
  ]

  const items = useMemo(() => {
    if (tab === "owned") return owned
    if (tab === "available") return available
    return history
  }, [tab, owned, available, history])

  if (owned.length === 0 && available.length === 0 && history.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Шалгалтууд</h2>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
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
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full w-5 h-5 text-xs font-bold",
                tab === t.id ? "bg-white/25 text-white" : "bg-background text-muted-foreground"
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "owned" && (
        owned.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Танд одоогвор шалгалт алга.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {owned.map((e) => <OwnedOmrCard key={e.id} exam={e} />)}
          </div>
        )
      )}

      {tab === "available" && (
        available.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Нээлттэй шалгалт байхгүй.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {available.map((e) => <AvailableOmrCard key={e.id} exam={e} />)}
          </div>
        )
      )}

      {tab === "history" && (
        history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Дууссан шалгалт байхгүй.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((a) => <HistoryOmrCard key={a.id} attempt={a} />)}
          </div>
        )
      )}
    </div>
  )
}

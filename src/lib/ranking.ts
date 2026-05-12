// Server-only module — do NOT import in client components.
// Pure utility functions live in ranking-utils.ts.

import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { getTier } from "@/lib/ranking-utils"

export { getTier, getTierColor, getTierEmoji } from "@/lib/ranking-utils"

function calcStreak(submittedDates: string[]): number {
  if (!submittedDates.length) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daySet = new Set(
    submittedDates.map((d) => {
      const dt = new Date(d)
      dt.setHours(0, 0, 0, 0)
      return dt.getTime()
    })
  )

  let streak = 0
  const cursor = new Date(today)
  while (daySet.has(cursor.getTime())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export async function updateRankScore(userId: string): Promise<void> {
  const admin = getSupabaseAdmin()

  const { data: attempts } = await admin
    .from("attempts")
    .select("score_percentage, submitted_at")
    .eq("user_id", userId)
    .eq("status", "submitted")
    .not("score_percentage", "is", null)

  if (!attempts?.length) return

  const avgScore =
    attempts.reduce((s, a) => s + (a.score_percentage ?? 0), 0) / attempts.length
  const total = attempts.length
  const streak = calcStreak(
    attempts.map((a) => a.submitted_at).filter(Boolean) as string[]
  )

  const rankScore = avgScore * 0.6 + Math.min(total, 50) * 0.4 + streak * 5
  const rankTier  = getTier(rankScore)

  await admin
    .from("profiles")
    .update({ rank_score: rankScore, rank_tier: rankTier })
    .eq("id", userId)
}

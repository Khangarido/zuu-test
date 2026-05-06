// Pure utility functions — safe to import in client components

export function getTier(score: number): string {
  if (score >= 90) return "Diamond"
  if (score >= 75) return "Platinum"
  if (score >= 60) return "Gold"
  if (score >= 40) return "Silver"
  return "Bronze"
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case "Diamond":  return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
    case "Platinum": return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
    case "Gold":     return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
    case "Silver":   return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
    default:         return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
  }
}

export function getTierEmoji(tier: string): string {
  switch (tier) {
    case "Diamond":  return "👑"
    case "Platinum": return "💎"
    case "Gold":     return "🥇"
    case "Silver":   return "🥈"
    default:         return "🥉"
  }
}

// Pure utility functions — safe to import in client components

export function expTier(exp: number): { tier: string; color: string; next: number } {
  if (exp < 500)   return { tier: "Шинэхэн",      color: "#94A3B8", next: 500 }
  if (exp < 1500)  return { tier: "Дадлагажигч",  color: "#22C55E", next: 1500 }
  if (exp < 3000)  return { tier: "Дунд",          color: "#3B82F6", next: 3000 }
  if (exp < 6000)  return { tier: "Мэргэн",        color: "#8B5CF6", next: 6000 }
  if (exp < 10000) return { tier: "Аварга",        color: "#F59E0B", next: 10000 }
  return                  { tier: "Легенд",        color: "#EF4444", next: Infinity }
}

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

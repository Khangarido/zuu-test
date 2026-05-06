"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/app/admin/_auth"
import { updateRankScore } from "@/lib/ranking"

export async function promoteToAdmin(userId: string) {
  await requireSuperAdmin()
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/dashboard")
}

export async function findUserByEmail(email: string): Promise<{ id: string; full_name: string | null; role: string } | null> {
  await requireSuperAdmin()
  const admin = getSupabaseAdmin()
  const { data: { users }, error } = await admin.auth.admin.listUsers()
  if (error) throw new Error(error.message)
  const authUser = users.find((u) => u.email === email.trim().toLowerCase())
  if (!authUser) return null
  const { data } = await admin.from("profiles").select("id, full_name, role").eq("id", authUser.id).maybeSingle()
  return data
}

export async function findUserByUsername(username: string): Promise<{ id: string; full_name: string | null } | null> {
  await requireSuperAdmin()
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle()
  return data
}

export async function setRoleByEmail(email: string, role: "admin" | "student"): Promise<void> {
  await requireSuperAdmin()
  const admin = getSupabaseAdmin()
  const { data: { users }, error: authError } = await admin.auth.admin.listUsers()
  if (authError) throw new Error(authError.message)
  const authUser = users.find((u) => u.email === email.trim().toLowerCase())
  if (!authUser) throw new Error("Тухайн имэйл бүртгэлтэй хэрэглэгч олдсонгүй")
  const { error } = await admin.from("profiles").update({ role }).eq("id", authUser.id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/dashboard")
}

export async function recalculateAllRanks(): Promise<{ updated: number }> {
  await requireSuperAdmin()
  const admin = getSupabaseAdmin()
  const { data: students } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "student")
  if (!students?.length) return { updated: 0 }
  await Promise.allSettled(students.map((s) => updateRankScore(s.id)))
  revalidatePath("/admin/dashboard")
  return { updated: students.length }
}

export async function exportAllStudentsCsv(): Promise<string> {
  await requireSuperAdmin()
  const admin = getSupabaseAdmin()
  const { data: students } = await admin
    .from("profiles")
    .select("id, full_name, username, email, grade, subjects, rank_score, rank_tier, created_at")
    .eq("role", "student")
    .order("rank_score", { ascending: false })

  const { data: attempts } = await admin
    .from("attempts")
    .select("user_id, score_percentage")
    .eq("status", "submitted")

  const statsMap: Record<string, { count: number; total: number }> = {}
  for (const a of attempts ?? []) {
    if (!statsMap[a.user_id]) statsMap[a.user_id] = { count: 0, total: 0 }
    statsMap[a.user_id].count++
    statsMap[a.user_id].total += a.score_percentage ?? 0
  }

  const GRADE_LABELS: Record<string, string> = { graduated: "Төгссөн", other: "Бусад" }
  const gradeLabel = (g: string | null) => g ? (GRADE_LABELS[g] ?? `${g}-р анги`) : ""

  const header = ["Нэр", "Username", "Имэйл", "Анги", "Хичээлүүд", "Оролдлого", "Дундаж оноо", "Rank", "Tier", "Бүртгэгдсэн"].join(",")
  const rows = (students ?? []).map((s) => {
    const st = statsMap[s.id]
    return [
      `"${s.full_name ?? ""}"`,
      s.username ?? "",
      s.email ?? "",
      gradeLabel(s.grade as string | null),
      `"${((s.subjects as string[] | null) ?? []).join("; ")}"`,
      st?.count ?? 0,
      st ? (st.total / st.count).toFixed(1) : "",
      (s.rank_score as number ?? 0).toFixed(1),
      s.rank_tier ?? "Bronze",
      new Date(s.created_at as string).toLocaleDateString("mn-MN"),
    ].join(",")
  })
  return [header, ...rows].join("\n")
}

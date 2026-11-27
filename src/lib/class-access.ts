import type { SupabaseClient } from "@supabase/supabase-js"

export type ClassAccessSettings = {
  access_mode?: string | null
  access_end_date?: string | null
  access_days?: number | null
}

/** When a membership starting `from` ends. null = never expires. */
export function computeExpiry(cls: ClassAccessSettings, from: Date = new Date()): string | null {
  if (cls.access_mode === "fixed_date") {
    return cls.access_end_date ? new Date(cls.access_end_date).toISOString() : null
  }
  const days = cls.access_days && cls.access_days > 0 ? cls.access_days : 30
  return new Date(from.getTime() + days * 86_400_000).toISOString()
}

export function isMembershipActive(m: { role?: string | null; expires_at?: string | null }): boolean {
  if (m.role === "teacher") return true
  return !m.expires_at || new Date(m.expires_at).getTime() > Date.now()
}

/** Create or renew a membership. Renewal extends from the later of now / current expiry (duration mode). */
export async function grantMembership(
  admin: SupabaseClient<any, any, any>,
  cls: { id: string } & ClassAccessSettings,
  userId: string,
  source: "paid" | "invite" | "teacher" | "admin" | "public",
  addedBy?: string | null,
  opts: { noExpiry?: boolean } = {},
): Promise<{ error?: string; expires_at: string | null }> {
  const { data: existing } = await admin
    .from("class_members")
    .select("role, expires_at")
    .eq("class_id", cls.id)
    .eq("user_id", userId)
    .maybeSingle()

  if (existing?.role === "teacher") return { expires_at: null }

  let base = new Date()
  if (existing?.expires_at && cls.access_mode !== "fixed_date") {
    const cur = new Date(existing.expires_at)
    if (cur > base) base = cur
  }
  const expires_at = opts.noExpiry || source === "public" ? null : computeExpiry(cls, base)

  if (existing) {
    const { error } = await admin
      .from("class_members")
      .update({ expires_at, source, added_by: addedBy ?? null })
      .eq("class_id", cls.id)
      .eq("user_id", userId)
    return error ? { error: error.message, expires_at } : { expires_at }
  }
  const { error } = await admin.from("class_members").insert({
    class_id: cls.id, user_id: userId, role: "student", expires_at, source, added_by: addedBy ?? null,
  })
  return error ? { error: error.message, expires_at } : { expires_at }
}

/** Exam ids the user can take through an active class membership. */
export async function classExamIdsForUser(admin: SupabaseClient<any, any, any>, userId: string): Promise<string[]> {
  const { data: mems } = await admin
    .from("class_members")
    .select("class_id, role, expires_at")
    .eq("user_id", userId)
  const classIds = (mems ?? []).filter(isMembershipActive).map((m: any) => m.class_id as string)
  if (classIds.length === 0) return []
  const { data: ce } = await admin.from("class_exams").select("exam_set_id").in("class_id", classIds)
  return Array.from(new Set((ce ?? []).map((r: any) => r.exam_set_id as string).filter(Boolean)))
}

export async function hasClassExamAccess(
  admin: SupabaseClient<any, any, any>, userId: string, examSetId: string,
): Promise<boolean> {
  return (await classExamIdsForUser(admin, userId)).includes(examSetId)
}

/**
 * Exams that exist only for private-class members: free exams attached to a private class.
 * (A priced exam that is also in a class bundle stays buyable on its own.)
 */
export async function classOnlyExamIds(admin: SupabaseClient<any, any, any>): Promise<string[]> {
  const { data: priv } = await admin.from("classes").select("id").eq("is_private", true)
  const ids = (priv ?? []).map((c: any) => c.id as string)
  if (ids.length === 0) return []
  const { data: ce } = await admin.from("class_exams").select("exam_set_id, exam_sets(price)").in("class_id", ids)
  const out = new Set<string>()
  for (const r of ce ?? []) {
    const es: any = Array.isArray((r as any).exam_sets) ? (r as any).exam_sets[0] : (r as any).exam_sets
    if (es && (es.price ?? 0) === 0) out.add((r as any).exam_set_id as string)
  }
  return Array.from(out)
}

"use server"

import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile || !["admin", "superadmin"].includes(profile.role as string)) {
    throw new Error("Зөвшөөрөл байхгүй")
  }
}

export async function addTimer(classId: string, label: string, targetDate: string) {
  await assertAdmin()
  const admin = getSupabaseAdmin()
  const { error } = await admin.from("class_timers").insert({
    class_id: classId,
    label: label.trim(),
    target_date: new Date(targetDate).toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function deleteTimer(timerId: string) {
  await assertAdmin()
  const admin = getSupabaseAdmin()
  const { error } = await admin.from("class_timers").delete().eq("id", timerId)
  if (error) throw new Error(error.message)
}

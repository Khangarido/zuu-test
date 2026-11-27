"use server"
import { revalidatePath } from "next/cache"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (!p || !["admin", "superadmin"].includes(p.role as string)) throw new Error("Forbidden")
  return user
}

export async function createClass(data: {
  name: string; slug: string; description: string; is_public: boolean
}) {
  const user = await requireAdmin()
  const admin = getSupabaseAdmin()
  const slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  const { error } = await admin.from("classes").insert({
    name: data.name, slug, description: data.description || null,
    is_public: data.is_public, is_private: !data.is_public, teacher_id: user.id,
  })
  if (error) return { error: error.message }
  revalidatePath("/admin/classes")
  revalidatePath("/classes")
  return { success: true }
}

export async function updateClass(id: string, data: {
  name: string; description: string; is_public: boolean
  price: number; access_mode: "duration" | "fixed_date"; access_days: number
  access_end_date: string | null; byl_price_id: number | null
}) {
  await requireAdmin()
  if (!Number.isFinite(data.price) || data.price < 0) return { error: "Үнэ буруу байна" }
  if (data.access_mode === "fixed_date" && !data.access_end_date) return { error: "Дуусах огноог оруулна уу" }
  if (data.access_mode === "duration" && (!Number.isInteger(data.access_days) || data.access_days < 1)) {
    return { error: "Хоногийн тоо буруу байна" }
  }
  const admin = getSupabaseAdmin()
  const { error } = await admin.from("classes").update({
    name: data.name, description: data.description || null,
    is_public: data.is_public, is_private: !data.is_public,
    price: Math.round(data.price),
    access_mode: data.access_mode,
    access_days: data.access_days,
    access_end_date: data.access_mode === "fixed_date" && data.access_end_date
      ? new Date(data.access_end_date).toISOString() : null,
    byl_price_id: data.byl_price_id,
  }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/classes")
  revalidatePath("/classes")
  return { success: true }
}

export async function regenerateInvite(id: string) {
  await requireAdmin()
  const admin = getSupabaseAdmin()
  const token = crypto.randomUUID().replace(/-/g, "")
  const { error } = await admin.from("classes").update({ invite_token: token }).eq("id", id)
  if (error) return { error: error.message }
  return { success: true, token }
}

export async function deleteClass(id: string) {
  await requireAdmin()
  const admin = getSupabaseAdmin()
  const { error } = await admin.from("classes").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/classes")
  revalidatePath("/classes")
  return { success: true }
}

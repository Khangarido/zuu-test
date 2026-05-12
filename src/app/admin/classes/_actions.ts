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
    is_public: data.is_public, teacher_id: user.id,
  })
  if (error) return { error: error.message }
  revalidatePath("/admin/classes")
  revalidatePath("/classes")
  return { success: true }
}

export async function updateClass(id: string, data: {
  name: string; description: string; is_public: boolean
}) {
  await requireAdmin()
  const admin = getSupabaseAdmin()
  const { error } = await admin.from("classes").update({
    name: data.name, description: data.description || null, is_public: data.is_public,
  }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/classes")
  revalidatePath("/classes")
  return { success: true }
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

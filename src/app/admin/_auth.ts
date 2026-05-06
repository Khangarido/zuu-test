"use server"

import { createClient } from "@/lib/supabase/server"

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Нэвтрээгүй хэрэглэгч байна.")
  const { data: profile, error } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!profile || !["admin", "superadmin"].includes(profile.role))
    throw new Error("Зөвхөн админ хэрэглэгч энэ үйлдлийг хийх боломжтой.")
  return supabase
}

export async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Нэвтрээгүй хэрэглэгч байна.")
  const { data: profile, error } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!profile || profile.role !== "superadmin")
    throw new Error("Зөвхөн супер-админ энэ үйлдлийг хийх боломжтой.")
  return supabase
}

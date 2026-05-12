"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const subjectSchema = z.object({
  name: z.string().trim().min(2, "Нэр хамгийн багадаа 2 тэмдэгт байна.").max(100, "Нэр хамгийн ихдээ 100 тэмдэгт байна."),
  description: z.string().trim().max(1000, "Тайлбар хэт урт байна.").optional(),
  icon: z.string().trim().max(20, "Icon хэт урт байна.").optional(),
  is_active: z.boolean(),
})

const topicSchema = z.object({
  name: z.string().trim().min(2, "Сэдвийн нэр хамгийн багадаа 2 тэмдэгт байна.").max(100, "Сэдвийн нэр хамгийн ихдээ 100 тэмдэгт байна."),
})

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Нэвтрээгүй хэрэглэгч байна.")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    throw new Error("Зөвхөн админ хэрэглэгч энэ үйлдлийг хийх боломжтой.")
  }

  return getSupabaseAdmin()
}

function normalizeOptional(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseSubject(formData: FormData) {
  const parsed = subjectSchema.safeParse({
    name: formData.get("name"),
    description: normalizeOptional(formData.get("description")),
    icon: normalizeOptional(formData.get("icon")),
    is_active: formData.get("is_active") === "on",
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Хичээлийн мэдээлэл буруу байна.")
  }

  return parsed.data
}

function parseTopic(formData: FormData) {
  const parsed = topicSchema.safeParse({
    name: formData.get("name"),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Сэдвийн мэдээлэл буруу байна.")
  }

  return parsed.data
}

export async function createSubject(formData: FormData) {
  const supabase = await requireAdmin()
  const payload = parseSubject(formData)

  const { error } = await supabase.from("subjects").insert({
    name: payload.name,
    description: payload.description ?? null,
    icon: payload.icon ?? null,
    is_active: payload.is_active,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/admin/subjects")
}

export async function updateSubject(id: string, formData: FormData) {
  if (!id) throw new Error("Хичээлийн ID олдсонгүй.")

  const supabase = await requireAdmin()
  const payload = parseSubject(formData)

  const { error } = await supabase
    .from("subjects")
    .update({
      name: payload.name,
      description: payload.description ?? null,
      icon: payload.icon ?? null,
      is_active: payload.is_active,
    })
    .eq("id", id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/admin/subjects")
}

export async function deleteSubject(id: string) {
  if (!id) throw new Error("Хичээлийн ID олдсонгүй.")

  const supabase = await requireAdmin()
  const { error } = await supabase.from("subjects").delete().eq("id", id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/admin/subjects")
}

export async function createTopic(subjectId: string, formData: FormData) {
  if (!subjectId) throw new Error("Хичээлийн ID олдсонгүй.")

  const supabase = await requireAdmin()
  const payload = parseTopic(formData)

  const { error } = await supabase.from("topics").insert({
    subject_id: subjectId,
    name: payload.name,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/admin/subjects")
}

export async function deleteTopic(id: string) {
  if (!id) throw new Error("Сэдвийн ID олдсонгүй.")

  const supabase = await requireAdmin()
  const { error } = await supabase.from("topics").delete().eq("id", id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/admin/subjects")
}

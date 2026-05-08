"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const examSetSchema = z.object({
  title: z.string().trim().min(2, "Гарчиг хамгийн багадаа 2 тэмдэгт байна.").max(200, "Гарчиг хамгийн ихдээ 200 тэмдэгт байна."),
  description: z.string().trim().max(1000, "Тайлбар хамгийн ихдээ 1000 тэмдэгт байна.").optional(),
  subject_id: z.string().uuid("Хичээл сонгоно уу."),
  duration_minutes: z.number({ error: "Хугацаа зөв тоо байх ёстой." }).min(5).max(300),
  price: z.number({ error: "Үнэ зөв тоо байх ёстой." }).min(0),
  shuffle_questions: z.boolean(),
  is_active: z.boolean(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Нэвтрээгүй хэрэглэгч байна.")
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!profile || !["admin", "superadmin"].includes(profile.role)) throw new Error("Зөвхөн админ хэрэглэгч энэ үйлдлийг хийх боломжтой.")
  return supabase
}

function normalizeOptional(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseNumber(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim().length === 0) return NaN
  return Number(raw)
}

function parseExamSet(formData: FormData) {
  const parsed = examSetSchema.safeParse({
    title: formData.get("title"),
    description: normalizeOptional(formData.get("description")),
    subject_id: formData.get("subject_id"),
    duration_minutes: parseNumber(formData.get("duration_minutes")),
    price: parseNumber(formData.get("price")),
    shuffle_questions: formData.get("shuffle_questions") === "on",
    is_active: formData.get("is_active") === "on",
  })
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Шалгалтын мэдээлэл буруу байна.")
  return parsed.data
}

export async function createExamSet(formData: FormData) {
  const supabase = await requireAdmin()
  const payload = parseExamSet(formData)
  const { error } = await supabase.from("exam_sets").insert({
    title: payload.title,
    description: payload.description ?? null,
    subject_id: payload.subject_id,
    duration_minutes: payload.duration_minutes,
    price: payload.price,
    shuffle_questions: payload.shuffle_questions,
    is_active: payload.is_active,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/admin/exam-sets")
}

export async function updateExamSet(id: string, formData: FormData) {
  if (!id) throw new Error("Шалгалтын ID олдсонгүй.")
  const supabase = await requireAdmin()
  const payload = parseExamSet(formData)
  const { error } = await supabase.from("exam_sets").update({
    title: payload.title,
    description: payload.description ?? null,
    subject_id: payload.subject_id,
    duration_minutes: payload.duration_minutes,
    price: payload.price,
    shuffle_questions: payload.shuffle_questions,
    is_active: payload.is_active,
  }).eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/exam-sets")
}

export async function deleteExamSet(id: string) {
  if (!id) throw new Error("Шалгалтын ID олдсонгүй.")
  const supabase = await requireAdmin()
  const { error } = await supabase.from("exam_sets").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/exam-sets")
}

export async function toggleExamSetActive(id: string, isActive: boolean) {
  if (!id) throw new Error("Шалгалтын ID олдсонгүй.")
  const supabase = await requireAdmin()
  const { error } = await supabase.from("exam_sets").update({ is_active: isActive }).eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/exam-sets")
}

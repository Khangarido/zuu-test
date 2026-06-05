"use server"

import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function updateUserPermissions(
  userId: string,
  perms: { is_teacher: boolean; can_post: boolean; can_comment: boolean }
) {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("profiles")
    .update({
      is_teacher: perms.is_teacher,
      can_post: perms.can_post,
      can_comment: perms.can_comment,
    })
    .eq("id", userId)
  if (error) throw new Error(error.message)
}

export type ExamSetAccessRow = {
  id: string
  title: string
  is_free: boolean
  has_access: boolean
}

export async function getExamSetsWithAccess(userId: string): Promise<ExamSetAccessRow[]> {
  const admin = getSupabaseAdmin()
  const { data: examSets, error: examError } = await admin
    .from("exam_sets")
    .select("id, title, price")
    .order("title")

  if (examError) throw new Error(examError.message)

  const { data: access, error: accessError } = await admin
    .from("user_exam_access")
    .select("exam_set_id")
    .eq("user_id", userId)

  if (accessError) throw new Error(accessError.message)

  const accessIds = new Set((access ?? []).map((a) => a.exam_set_id as string))

  return (examSets ?? []).map((e) => ({
    id: e.id as string,
    title: e.title as string,
    is_free: ((e.price as number) ?? 0) === 0,
    has_access: accessIds.has(e.id as string),
  }))
}

export async function updateUserExamAccess(userId: string, examSetIds: string[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const admin = getSupabaseAdmin()
  const { error: deleteError } = await admin
    .from("user_exam_access")
    .delete()
    .eq("user_id", userId)

  if (deleteError) throw new Error(deleteError.message)

  if (examSetIds.length > 0) {
    const { error: insertError } = await admin.from("user_exam_access").insert(
      examSetIds.map((id) => ({
        user_id: userId,
        exam_set_id: id,
        granted_by: user.id,
      }))
    )
    if (insertError) throw new Error(insertError.message)
  }
}

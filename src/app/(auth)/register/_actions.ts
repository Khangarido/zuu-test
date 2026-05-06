"use server"

import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function finaliseProfile(
  userId: string,
  avatarUrl: string | null,
  username: string,
  grade: string,
  subjects: string[]
): Promise<void> {
  const admin = getSupabaseAdmin()
  await admin
    .from("profiles")
    .update({
      username: username || null,
      grade,
      subjects,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", userId)
}

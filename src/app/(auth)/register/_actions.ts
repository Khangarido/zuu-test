"use server"

import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function finaliseProfile(
  userId: string,
  avatarUrl: string | null,
  username: string,
  grade: string,
  subjects: string[],
  firstName: string,
  lastName: string,
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.from("profiles").upsert({
    id: userId,
    full_name: `${lastName} ${firstName}`.trim(),
    first_name: firstName,
    last_name: lastName,
    username: username || null,
    grade,
    subjects,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
  }, { onConflict: "id" })
  if (error) console.error("finaliseProfile error:", error)
}

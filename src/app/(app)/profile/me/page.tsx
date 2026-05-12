import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function ProfileMePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.username) {
    redirect(`/profile/${profile.username}`)
  }

  redirect("/profile/edit")
}

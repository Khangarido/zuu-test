import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { grantMembership } from "@/lib/class-access"

export const dynamic = "force-dynamic"

/** Invite link: /classes/join/<token> */
export default async function JoinByInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/classes/join/${token}`)}`)

  const admin = getSupabaseAdmin()
  const { data: cls } = await admin
    .from("classes")
    .select("id, slug, access_mode, access_end_date, access_days")
    .eq("invite_token", token)
    .maybeSingle()
  if (!cls) redirect("/classes?invite=invalid")

  const res = await grantMembership(admin, cls, user.id, "invite")
  if (res.error) redirect("/classes?invite=error")
  redirect(`/classes/${cls.slug}`)
}

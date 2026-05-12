import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AdminClassesClient } from "./_client"

export const dynamic = "force-dynamic"

export default async function AdminClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (!profile || !["admin", "superadmin"].includes(profile.role as string)) redirect("/dashboard")

  const admin = getSupabaseAdmin()
  const { data: classes } = await admin
    .from("classes")
    .select("id, name, slug, description, is_public, member_count, created_at")
    .order("created_at", { ascending: false })

  return <AdminClassesClient classes={(classes ?? []) as any} />
}

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { Key } from "lucide-react"
import { PermissionsClient } from "./_client"

export const dynamic = "force-dynamic"

export default async function AdminPermissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (!me || !["admin", "superadmin"].includes(me.role as string)) redirect("/dashboard")

  const admin = getSupabaseAdmin()
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, username, email, avatar_url, role, is_teacher, can_post, can_comment, grade, school")
    .order("full_name", { ascending: true })

  const users = (profiles ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name ?? null,
    username: p.username ?? null,
    email: p.email ?? null,
    avatar_url: p.avatar_url ?? null,
    role: p.role ?? null,
    is_teacher: !!p.is_teacher,
    can_post: !!p.can_post,
    can_comment: !!p.can_comment,
    grade: p.grade ? String(p.grade) : null,
    school: p.school ?? null,
  }))

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
          <Key className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Эрхүүд</h1>
          <p className="text-sm text-muted-foreground">
            Хэрэглэгчдийн нийтлэл, сэтгэгдэл, багшийн эрхийг тохируулах
          </p>
        </div>
      </div>

      <PermissionsClient users={users} />
    </div>
  )
}

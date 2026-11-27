import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { grantMembership } from "@/lib/class-access"

async function authorize(classId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 }) }
  const admin = getSupabaseAdmin()
  const [{ data: me }, { data: cls }, { data: mem }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("classes").select("id, teacher_id, access_mode, access_end_date, access_days").eq("id", classId).maybeSingle(),
    admin.from("class_members").select("role").eq("class_id", classId).eq("user_id", user.id).maybeSingle(),
  ])
  if (!cls) return { error: NextResponse.json({ error: "Анги олдсонгүй" }, { status: 404 }) }
  const isAdmin = me?.role === "admin" || me?.role === "superadmin"
  if (!(isAdmin || cls.teacher_id === user.id || mem?.role === "teacher")) {
    return { error: NextResponse.json({ error: "Зөвшөөрөл байхгүй" }, { status: 403 }) }
  }
  return { user, admin, cls }
}

/** Teacher/admin adds a student by student code, username or email. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { classId?: string; identifier?: string }
  const identifier = (body.identifier ?? "").trim()
  if (!body.classId || !identifier) return NextResponse.json({ error: "Буруу хүсэлт" }, { status: 400 })

  const a = await authorize(body.classId)
  if ("error" in a) return a.error
  const { user, admin, cls } = a

  const cols = "id, full_name, username"
  const lower = identifier.toLowerCase()
  let target: { id: string; full_name: string | null; username: string | null } | null = null
  const lookups: Array<[string, string]> = identifier.includes("@")
    ? [["email", lower]]
    : [["student_code", identifier.toUpperCase()], ["username", lower]]
  for (const [col, val] of lookups) {
    const { data } = await admin.from("profiles").select(cols).eq(col, val).maybeSingle()
    if (data) { target = data as any; break }
  }
  if (!target) return NextResponse.json({ error: "Сурагч олдсонгүй (код, нэвтрэх нэр эсвэл имэйл шалгана уу)" }, { status: 404 })

  const res = await grantMembership(admin, cls, target.id, "teacher", user.id)
  if (res.error) return NextResponse.json({ error: "Нэмэхэд алдаа гарлаа" }, { status: 500 })
  return NextResponse.json({ ok: true, name: target.full_name ?? target.username, expires_at: res.expires_at })
}

/** Teacher/admin removes a student. */
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({})) as { classId?: string; userId?: string }
  if (!body.classId || !body.userId) return NextResponse.json({ error: "Буруу хүсэлт" }, { status: 400 })
  const a = await authorize(body.classId)
  if ("error" in a) return a.error
  const { error } = await a.admin.from("class_members").delete()
    .eq("class_id", body.classId).eq("user_id", body.userId).neq("role", "teacher")
  if (error) return NextResponse.json({ error: "Хасахад алдаа гарлаа" }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { grantMembership } from "@/lib/class-access"

const CLASS_COLS = "id, name, slug, is_private, price, access_mode, access_end_date, access_days"

/**
 * Join a class.
 *  { token }   — invite link: free entry to any class (the teacher/admin chose to share it)
 *  { classId } — a public, free class
 * Private classes can NOT be joined by id: they need an invite link, a hand-add by the teacher, or payment.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 })

  let body: { token?: string; classId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Буруу хүсэлт" }, { status: 400 }) }

  const admin = getSupabaseAdmin()

  if (body.token) {
    const { data: cls } = await admin.from("classes").select(CLASS_COLS).eq("invite_token", body.token).maybeSingle()
    if (!cls) return NextResponse.json({ error: "Урилга хүчингүй байна" }, { status: 404 })
    const res = await grantMembership(admin, cls, user.id, "invite")
    if (res.error) return NextResponse.json({ error: "Нэгдэхэд алдаа гарлаа" }, { status: 500 })
    return NextResponse.json({ slug: cls.slug, name: cls.name })
  }

  if (body.classId) {
    const { data: cls } = await admin.from("classes").select(CLASS_COLS).eq("id", body.classId).maybeSingle()
    if (!cls) return NextResponse.json({ error: "Анги олдсонгүй" }, { status: 404 })
    if (cls.is_private || (cls.price ?? 0) > 0) {
      return NextResponse.json({ error: "PAYMENT_REQUIRED" }, { status: 402 })
    }
    const res = await grantMembership(admin, cls, user.id, "public")
    if (res.error) return NextResponse.json({ error: "Нэгдэхэд алдаа гарлаа" }, { status: 500 })
    return NextResponse.json({ slug: cls.slug, name: cls.name })
  }

  return NextResponse.json({ error: "Буруу хүсэлт" }, { status: 400 })
}

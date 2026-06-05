import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 })

  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Буруу хүсэлт" }, { status: 400 })
  }

  const code = (body?.code ?? "").trim().toUpperCase()
  if (!/^[A-Z]{5}$/.test(code)) {
    return NextResponse.json({ error: "Буруу код" }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: cls } = await admin
    .from("classes")
    .select("id, name, slug")
    .eq("invite_code", code)
    .maybeSingle()

  if (!cls) return NextResponse.json({ error: "Код олдсонгүй" }, { status: 400 })

  const { data: existing } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("class_id", cls.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "Та аль хэдийн нэгдсэн байна" }, { status: 400 })
  }

  const { error: insertError } = await admin.from("class_members").insert({
    class_id: cls.id,
    user_id: user.id,
    role: "student",
  })

  if (insertError) {
    return NextResponse.json({ error: "Нэгдэхэд алдаа гарлаа" }, { status: 500 })
  }

  return NextResponse.json({ slug: cls.slug, name: cls.name })
}

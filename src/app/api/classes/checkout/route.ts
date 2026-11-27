import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// "c." + base64url(userId) : base64url(classId)  (≤ 48 chars, the BYL reference limit)
function encodeRef(userId: string, classId: string): string {
  const enc = (uuid: string) => Buffer.from(uuid.replace(/-/g, ""), "hex").toString("base64url")
  return `c.${enc(userId)}:${enc(classId)}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { classId } = await req.json().catch(() => ({}))
  if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: cls } = await admin
    .from("classes").select("id, slug, price, byl_price_id").eq("id", classId).maybeSingle()
  if (!cls) return NextResponse.json({ error: "Анги олдсонгүй" }, { status: 404 })
  if ((cls.price ?? 0) <= 0) return NextResponse.json({ error: "Энэ анги үнэгүй" }, { status: 400 })
  if (!cls.byl_price_id) {
    // Never charge with a price that does not belong to this class.
    return NextResponse.json({ error: "Төлбөрийн үнэ тохируулаагүй байна (админд мэдэгдэнэ үү)" }, { status: 409 })
  }

  const token = process.env.BYL_TOKEN ?? ""
  const projectId = process.env.BYL_PROJECT_ID ?? ""
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://zuutest.site").trim()
  if (!token || !projectId) return NextResponse.json({ error: "Payment not configured" }, { status: 500 })

  const bylRes = await fetch(`https://byl.mn/api/v1/projects/${projectId}/checkouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ price_id: Number(cls.byl_price_id), quantity: 1 }],
      success_url: `${siteUrl}/classes/${cls.slug}?payment=success`,
      cancel_url: `${siteUrl}/classes/${cls.slug}?payment=cancelled`,
      client_reference_id: encodeRef(user.id, cls.id),
    }),
  })
  const txt = await bylRes.text()
  if (!bylRes.ok) {
    console.error("byl.mn class checkout error", bylRes.status, txt)
    return NextResponse.json({ error: `Төлбөрийн системийн алдаа (${bylRes.status})` }, { status: 502 })
  }
  return NextResponse.json({ url: JSON.parse(txt).data.url })
}

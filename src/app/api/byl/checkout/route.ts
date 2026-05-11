import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Encode two UUIDs into ≤48 chars: strip hyphens → 32 hex chars each → base64url (22 chars each) → "A:B" = 45 chars
function encodeRef(userId: string, examSetId: string): string {
  const encodeUUID = (uuid: string) =>
    Buffer.from(uuid.replace(/-/g, ""), "hex").toString("base64url")
  return `${encodeUUID(userId)}:${encodeUUID(examSetId)}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { examSetId } = await req.json()
  if (!examSetId) return NextResponse.json({ error: "Missing examSetId" }, { status: 400 })

  const { data: examSet } = await supabase
    .from("exam_sets")
    .select("id, title, price")
    .eq("id", examSetId)
    .maybeSingle()
  if (!examSet) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

  const token = process.env.BYL_TOKEN ?? ""
  const projectId = process.env.BYL_PROJECT_ID ?? ""
  const priceId = process.env.BYL_PRICE_ID ?? ""
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://zuutest.site").trim()

  if (!token || !projectId) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 })
  }

  const ref = encodeRef(user.id, examSetId)

  const bylRes = await fetch(
    `https://byl.mn/api/v1/projects/${projectId}/checkouts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: Number(priceId), quantity: 1 }],
        success_url: `${siteUrl}/dashboard?payment=success`,
        cancel_url: `${siteUrl}/dashboard?payment=cancelled`,
        client_reference_id: ref,
      }),
    }
  )

  const txt = await bylRes.text()
  if (!bylRes.ok) {
    console.error("byl.mn error", bylRes.status, txt)
    return NextResponse.json({ error: `byl.mn ${bylRes.status}: ${txt}` }, { status: 502 })
  }

  const json = JSON.parse(txt)
  return NextResponse.json({ url: json.data.url })
}

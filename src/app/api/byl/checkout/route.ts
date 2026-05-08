import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

function encodeUUID(uuid: string): string {
  return Buffer.from(uuid.replace(/-/g, ""), "hex").toString("base64url")
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { examSetId } = await req.json()
  if (!examSetId) return NextResponse.json({ error: "Missing examSetId" }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: examSet } = await admin
    .from("exam_sets")
    .select("id, title, price")
    .eq("id", examSetId)
    .maybeSingle()
  if (!examSet) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
  if (!examSet.price || examSet.price <= 0) return NextResponse.json({ error: "This exam is free" }, { status: 400 })

  if (!process.env.BYL_PROJECT_ID || !process.env.BYL_TOKEN) {
    console.error("byl.mn env vars missing: BYL_PROJECT_ID or BYL_TOKEN not set")
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 })
  }

  // Create a pending payment record — its unique UUID becomes the checkout reference
  const { data: pendingPayment, error: pendingErr } = await admin
    .from("payments")
    .insert({ user_id: user.id, exam_set_id: examSetId, amount: examSet.price, status: "pending", transaction_id: "" })
    .select("id")
    .single()
  if (pendingErr || !pendingPayment) {
    console.error("byl checkout: failed to create pending payment", pendingErr)
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 })
  }

  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://zuutest.site").trim()

  const bylRes = await fetch(
    `https://byl.mn/api/v1/projects/${process.env.BYL_PROJECT_ID}/checkouts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BYL_TOKEN}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{
          price_data: {
            unit_amount: examSet.price,
            product_data: { name: examSet.title },
          },
          quantity: 1,
        }],
        success_url: `${siteUrl}/dashboard?payment=success`,
        cancel_url: `${siteUrl}/dashboard?payment=cancelled`,
        client_reference_id: encodeUUID(pendingPayment.id),
      }),
    }
  )

  if (!bylRes.ok) {
    const txt = await bylRes.text()
    console.error("byl.mn checkout error:", bylRes.status, txt)
    return NextResponse.json({ error: `byl.mn error ${bylRes.status}: ${txt}` }, { status: 502 })
  }

  const json = await bylRes.json()
  return NextResponse.json({ url: json.data.url })
}

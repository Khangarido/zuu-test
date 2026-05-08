import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

function decodeUUID(encoded: string): string {
  const hex = Buffer.from(encoded, "base64url").toString("hex")
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get("Byl-Signature") ?? ""
  const secret = process.env.BYL_WEBHOOK_SECRET ?? ""

  if (!verifySignature(rawBody, sig, secret)) {
    console.error("byl.mn webhook: invalid signature")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: { type: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { type, data } = event
  console.log("byl.mn webhook event:", type, JSON.stringify(data))

  if (type === "checkout.completed" || type === "invoice.paid") {
    const ref = (data?.client_reference_id ?? "") as string
    if (!ref) {
      console.error("byl webhook: missing client_reference_id")
      return NextResponse.json({ ok: true })
    }

    const admin = getSupabaseAdmin()
    const amount = (data?.amount as number) ?? (data?.total as number) ?? 0
    const transactionId = String(data?.id ?? "")

    // New format: single encoded payment UUID
    const paymentId = decodeUUID(ref)
    const { data: payment, error: payLookupErr } = await admin
      .from("payments")
      .select("user_id, exam_set_id")
      .eq("id", paymentId)
      .maybeSingle()

    if (payLookupErr || !payment) {
      console.error("byl webhook: payment record not found", paymentId, payLookupErr)
      return NextResponse.json({ ok: true })
    }

    const { user_id: userId, exam_set_id: examSetId } = payment

    // Update payment to completed
    await admin.from("payments").update({ status: "completed", transaction_id: transactionId, amount }).eq("id", paymentId)

    // Grant access
    const { error: accessErr } = await admin
      .from("access")
      .upsert({ user_id: userId, exam_set_id: examSetId }, { onConflict: "user_id,exam_set_id" })

    if (accessErr) console.error("byl webhook: access upsert error", accessErr)
  }

  return NextResponse.json({ ok: true })
}

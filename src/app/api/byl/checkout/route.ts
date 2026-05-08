import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
  if (!examSet.price || examSet.price <= 0) return NextResponse.json({ error: "This exam is free" }, { status: 400 })

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
        client_reference_id: `${user.id}:${examSetId}`,
      }),
    }
  )

  if (!bylRes.ok) {
    const txt = await bylRes.text()
    console.error("byl.mn checkout error:", txt)
    return NextResponse.json({ error: "Payment gateway error" }, { status: 502 })
  }

  const json = await bylRes.json()
  return NextResponse.json({ url: json.data.url })
}

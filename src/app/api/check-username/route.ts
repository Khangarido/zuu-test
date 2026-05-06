import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.toLowerCase().trim()

  if (!username || !/^[a-z0-9]{3,20}$/.test(username)) {
    return NextResponse.json({ available: false, reason: "invalid" })
  }

  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  return NextResponse.json({ available: !data })
}

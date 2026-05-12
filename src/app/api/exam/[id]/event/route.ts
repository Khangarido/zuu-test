import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const body = (await request.json()) as { type?: string }
  if (body.type !== "tab_switch") {
    return NextResponse.json({ error: "UNSUPPORTED_EVENT" }, { status: 400 })
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select("id, user_id, tab_switch_count")
    .eq("id", id)
    .maybeSingle()

  if (attemptError) return NextResponse.json({ error: attemptError.message }, { status: 400 })
  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from("attempts")
    .update({ tab_switch_count: (attempt.tab_switch_count ?? 0) + 1 })
    .eq("id", id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

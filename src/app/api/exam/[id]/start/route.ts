import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ExamStartError, startOrResumeAttempt } from "@/lib/exam/start"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  try {
    const { examSet, attempt } = await startOrResumeAttempt(id, user.id)
    return NextResponse.json({
      attempt_id: attempt.id,
      started_at: attempt.started_at,
      duration_minutes: examSet.duration_minutes,
      server_time: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof ExamStartError) {
      if (error.code === "NOT_FOUND") {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
      }
      if (error.code === "NO_ACCESS") {
        return NextResponse.json({ error: "NO_ACCESS" }, { status: 403 })
      }
      if (error.code === "ALREADY_SUBMITTED") {
        return NextResponse.json(
          { error: "ALREADY_SUBMITTED", attempt_id: error.attemptId },
          { status: 409 }
        )
      }
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

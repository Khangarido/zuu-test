import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { Timer } from "lucide-react"
import { TimersClient } from "./_client"

export const dynamic = "force-dynamic"

export default async function AdminTimersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (!me || !["admin", "superadmin"].includes(me.role as string)) redirect("/dashboard")

  const admin = getSupabaseAdmin()
  const { data: classes } = await admin
    .from("classes")
    .select("id, name, slug")
    .order("name", { ascending: true })

  const { data: allTimers } = await admin
    .from("class_timers")
    .select("id, class_id, label, target_date")
    .order("target_date", { ascending: true })

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
          <Timer className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Таймер</h1>
          <p className="text-sm text-muted-foreground">
            Ангийн ирэх арга хэмжээний тоолуурыг удирдах
          </p>
        </div>
      </div>

      <TimersClient
        classes={(classes ?? []) as any}
        initialTimers={(allTimers ?? []) as any}
      />
    </div>
  )
}

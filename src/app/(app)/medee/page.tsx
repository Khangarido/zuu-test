import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { AppShell } from "@/components/app-shell"
import { MedeeFeed } from "@/components/medee-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Newspaper, Info } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function MedeePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, username, avatar_url, is_teacher, can_post, can_comment")
    .eq("id", user.id)
    .maybeSingle()

  const role = profile?.role === "admin" || profile?.role === "superadmin" ? "admin" : "student"
  const isAdmin = role === "admin"
  const isTeacher = !!(profile?.is_teacher)
  const canPost = isAdmin || isTeacher || !!(profile?.can_post)
  const canComment = isAdmin || isTeacher || !!(profile?.can_comment)

  // Fetch recent post count for sidebar stats
  const admin = getSupabaseAdmin()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: weeklyCount } = await admin
    .from("medee_posts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekAgo)

  const { count: totalCount } = await admin
    .from("medee_posts")
    .select("id", { count: "exact", head: true })

  return (
    <AppShell
      fullName={(profile?.full_name as string | null) ?? ""}
      email={user.email ?? ""}
      role={role as "student" | "admin"}
      isAdmin={isAdmin}
      username={(profile?.username as string | null) ?? null}
      avatarUrl={(profile?.avatar_url as string | null) ?? null}
      userId={user.id}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10">
              <Newspaper className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight leading-none">Мэдээ</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Сургалтын мэдээ, зарлал, шинэчлэлүүд</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed */}
          <div className="lg:col-span-2">
            <MedeeFeed
              currentUserId={user.id}
              canPost={canPost}
              canComment={canComment}
              isAdmin={isAdmin}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="size-4 text-muted-foreground" />
                  Статистик
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Нийт мэдээ</span>
                  <span className="font-semibold">{totalCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">7 хоногт</span>
                  <span className="font-semibold">{weeklyCount ?? 0}</span>
                </div>
              </CardContent>
            </Card>

            {canPost && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Та <span className="font-semibold text-foreground">мэдээ нийтлэх</span> эрхтэй.
                    Шинэ мэдээ нийтлэхдээ зүүн хэсгийн маягтыг ашиглана уу.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

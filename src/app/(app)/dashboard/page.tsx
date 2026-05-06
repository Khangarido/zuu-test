import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  ShoppingCart,
  TrendingUp,
  BookOpen,
  Trophy,
  ArrowRight,
  Play,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatMnt(amount: number) {
  return new Intl.NumberFormat("mn-MN").format(amount) + "₮";
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : score >= 40
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {score.toFixed(0)}%
    </span>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: accessRows } = await supabase
    .from("access")
    .select("exam_set:exam_sets(id, title, description, duration_minutes)")
    .eq("user_id", user.id);

  const { data: attempts } = await supabase
    .from("attempts")
    .select(
      "id, status, score_percentage, submitted_at, exam_set:exam_sets(id, title)"
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  const accessIds = (accessRows ?? [])
    .map((r) => (r.exam_set as unknown as { id: string } | null)?.id)
    .filter((x): x is string => Boolean(x));

  let availableQuery = supabase
    .from("exam_sets")
    .select("id, title, description, duration_minutes, price")
    .eq("is_active", true);
  if (accessIds.length > 0) {
    availableQuery = availableQuery.not(
      "id",
      "in",
      `(${accessIds.join(",")})`
    );
  }
  const { data: available } = await availableQuery;

  const fullName  = profile?.full_name ?? "";
  const firstName = fullName.split(" ")[0] || "сурагч";
  const role      = profile?.role === "admin" || profile?.role === "superadmin" ? "admin" : "student";
  const submitted = (attempts ?? []).filter((a) => a.status === "submitted");

  const avgScore =
    submitted.length > 0
      ? submitted.reduce((sum, a) => sum + (a.score_percentage ?? 0), 0) /
        submitted.length
      : null;

  return (
    <AppShell
      fullName={fullName}
      email={user.email ?? ""}
      role={role}
      isAdmin={role === "admin"}
      username={profile?.username ?? null}
      avatarUrl={profile?.avatar_url ?? null}
    >
      <div className="space-y-10">
        {/* Welcome hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-6 sm:p-8 text-white shadow-lg">
          <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-white/5" />
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm font-medium mb-1">
              Сайн байна уу,
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {firstName}
            </h1>
            <p className="mt-2 text-indigo-200 text-sm">
              Өнөөдөр ямар шалгалт өгөх вэ?
            </p>

            {/* Stats row */}
            <div className="mt-6 grid grid-cols-3 gap-4 sm:gap-6">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 text-indigo-200 mb-1">
                  <BookOpen className="size-3.5" />
                  <span className="text-xs">Миний шалгалт</span>
                </div>
                <div className="text-2xl font-bold">{accessRows?.length ?? 0}</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 text-indigo-200 mb-1">
                  <CheckCircle2 className="size-3.5" />
                  <span className="text-xs">Дууссан</span>
                </div>
                <div className="text-2xl font-bold">{submitted.length}</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 text-indigo-200 mb-1">
                  <TrendingUp className="size-3.5" />
                  <span className="text-xs">Дундаж оноо</span>
                </div>
                <div className="text-2xl font-bold">
                  {avgScore != null ? `${avgScore.toFixed(0)}%` : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Exams */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Миний шалгалтууд</h2>
              <p className="text-sm text-muted-foreground">Нэвтрэх эрх авсан шалгалтууд</p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {accessRows?.length ?? 0}
            </Badge>
          </div>

          {(accessRows ?? []).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                <BookOpen className="size-10 text-muted-foreground/50" />
                <p className="text-sm">
                  Танд одоогоор худалдаж авсан шалгалт алга.
                  <br />
                  Доорх жагсаалтаас сонгоорой.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accessRows!.map((row) => {
                const e = row.exam_set as unknown as {
                  id: string;
                  title: string;
                  description: string | null;
                  duration_minutes: number;
                } | null;
                if (!e) return null;
                const lastAttempt = submitted
                  .filter(
                    (a) =>
                      (a.exam_set as unknown as { id: string } | null)?.id === e.id
                  )
                  .at(0);

                return (
                  <Card
                    key={e.id}
                    className="group hover:shadow-md transition-shadow duration-200 border-border/60"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{e.title}</CardTitle>
                        {lastAttempt && (
                          <ScoreBadge score={lastAttempt.score_percentage ?? 0} />
                        )}
                      </div>
                      {e.description && (
                        <CardDescription className="line-clamp-2 text-xs">
                          {e.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="size-3.5" />
                        <span>{e.duration_minutes} минут</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      {lastAttempt ? (
                        <div className="flex w-full gap-2">
                          <Button variant="outline" size="sm" className="flex-1 cursor-pointer" asChild>
                            <Link href={`/results/${lastAttempt.id}`}>
                              Үр дүн харах
                            </Link>
                          </Button>
                          <Button size="sm" className="cursor-pointer" asChild>
                            <Link href={`/exam/${e.id}?retake=1`}>
                              <Play className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white cursor-pointer"
                          asChild
                        >
                          <Link href={`/exam/${e.id}`}>
                            Эхлүүлэх
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Available Exams */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Нээлттэй шалгалтууд</h2>
              <p className="text-sm text-muted-foreground">Нэмэлт шалгалт авах</p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {available?.length ?? 0}
            </Badge>
          </div>

          {(available ?? []).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Шинэ шалгалтууд удахгүй гарна.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {available!.map((e) => (
                <Card
                  key={e.id}
                  className="group hover:shadow-md transition-shadow duration-200 border-border/60"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{e.title}</CardTitle>
                      {e.price === 0 ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 shrink-0 text-xs">
                          Үнэгүй
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 text-xs font-semibold">
                          {formatMnt(e.price)}
                        </Badge>
                      )}
                    </div>
                    {e.description && (
                      <CardDescription className="line-clamp-2 text-xs">
                        {e.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span>{e.duration_minutes} минут</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {e.price === 0 ? (
                      <Button
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white cursor-pointer"
                        asChild
                      >
                        <Link href={`/exam/${e.id}`}>
                          Эхлүүлэх
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full cursor-not-allowed opacity-60" disabled>
                        <ShoppingCart className="size-4" />
                        Удахгүй нээлттэй болно
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Completed history */}
        {submitted.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" />
              <h2 className="text-lg font-semibold">Өгсөн шалгалтууд</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {submitted.map((a) => {
                const e = a.exam_set as unknown as { id: string; title: string } | null;
                const score = a.score_percentage ?? 0;
                return (
                  <Card
                    key={a.id}
                    className="hover:shadow-md transition-shadow duration-200 border-border/60"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{e?.title}</CardTitle>
                        <ScoreBadge score={score} />
                      </div>
                      <CardDescription className="text-xs">
                        {a.submitted_at
                          ? new Date(a.submitted_at).toLocaleDateString("mn-MN", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "—"}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button variant="outline" className="w-full cursor-pointer" size="sm" asChild>
                        <Link href={`/results/${a.id}`}>
                          Дэлгэрэнгүй харах
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, Wallet, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

function formatMnt(amount: number) {
  return new Intl.NumberFormat("mn-MN").format(amount) + "₮";
}

export default async function AdminHomePage() {
  const supabase = await createClient();

  const [studentsRes, examsRes, paymentsRes, attemptsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("exam_sets")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("payments")
      .select("amount")
      .eq("status", "completed"),
    supabase
      .from("attempts")
      .select("*", { count: "exact", head: true })
      .gte(
        "started_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ),
  ]);

  const totalRevenue = (paymentsRes.data ?? []).reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0
  );

  const stats = [
    {
      label: "Нийт сурагч",
      value: studentsRes.count ?? 0,
      icon: Users,
    },
    {
      label: "Идэвхтэй шалгалт",
      value: examsRes.count ?? 0,
      icon: ClipboardList,
    },
    {
      label: "Нийт орлого",
      value: formatMnt(totalRevenue),
      icon: Wallet,
    },
    {
      label: "Сүүлийн 7 хоногт",
      value: attemptsRes.count ?? 0,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Самбар</h1>
        <p className="text-muted-foreground">Системийн ерөнхий статистик.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

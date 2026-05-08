import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function PaymentsAdminPage() {
  const supabase = getSupabaseAdmin();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, created_at, transaction_id, user:profiles(full_name, email), exam_set:exam_sets(title)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Төлбөр</h1>
        <p className="text-muted-foreground">byl.mn-аар орсон төлбөрүүдийн түүх.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Төлбөрийн түүх</CardTitle></CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Төлбөр олдсонгүй.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Огноо</TableHead>
                  <TableHead>Хэрэглэгч</TableHead>
                  <TableHead>Шалгалт</TableHead>
                  <TableHead>Дүн</TableHead>
                  <TableHead>Төлөв</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const user = Array.isArray(p.user) ? p.user[0] : p.user;
                  const examSet = Array.isArray(p.exam_set) ? p.exam_set[0] : p.exam_set;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.created_at).toLocaleDateString("mn-MN")}</TableCell>
                      <TableCell>{user?.full_name || user?.email || "—"}</TableCell>
                      <TableCell>{examSet?.title || "—"}</TableCell>
                      <TableCell>{new Intl.NumberFormat("mn-MN").format(p.amount)}₮</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                          {p.status === "completed" ? "Амжилттай" : p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

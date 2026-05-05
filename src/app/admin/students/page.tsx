import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function StudentsAdminPage() {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, school, grade, created_at, role")
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Сурагчид</h1>
        <p className="text-muted-foreground">
          Бүртгэлтэй сурагчдын жагсаалт.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Сүүлд бүртгүүлсэн ({students?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(students ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Бүртгэлтэй сурагч алга.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Нэр</TableHead>
                  <TableHead>Сургууль</TableHead>
                  <TableHead>Анги</TableHead>
                  <TableHead>Бүртгэгдсэн</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students!.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>{s.school ?? "—"}</TableCell>
                    <TableCell>{s.grade ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(s.created_at).toLocaleDateString("mn-MN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

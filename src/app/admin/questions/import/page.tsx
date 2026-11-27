import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { BulkImportClient } from "./_components"

type SearchParams = {
  exam_set_id?: string
}

const sampleFormat = `# Хэсэг 1 — Сонголттой асуулт
NOTE: Нэг зөв хариултыг сонгоно уу.
Q: Дараах илэрхийллийн утгыг олно уу.
A) 10
B) 12
C) 14
D) 16
ANSWER: C
EXPLANATION: Зөв бодолт нь ... (олон мөр байж болно)
DIFFICULTY: medium
TOPIC: Алгебр
---
# Хэсэг 2 — Задгай (нөхөх) асуулт
NOTE: Хариултаа тоогоор бичнэ үү.
Q: 5 × 5 = ?
ANSWER: 25
---
Q: Монгол улсын нийслэл хот аль вэ?
TYPE: FILL
ANSWER: Улаанбаатар
ANSWER: УБ
EXPLANATION: Нийслэл хотыг товчилж УБ гэж бичиж болно.
DIFFICULTY: easy`

function joinedName(joined: { name: string } | { name: string }[] | null) {
  return Array.isArray(joined) ? joined[0]?.name ?? "Тодорхойгүй" : joined?.name ?? "Тодорхойгүй"
}

export default async function QuestionsImportPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const params = await Promise.resolve(searchParams ?? {})
  const examSetId = params.exam_set_id ?? ""
  if (!examSetId) redirect("/admin/questions")

  const supabase = await createClient()

  const [{ data: examSet, error: examSetError }, { data: topics, error: topicsError }] =
    await Promise.all([
      supabase.from("exam_sets").select("id, title").eq("id", examSetId).maybeSingle(),
      supabase.from("topics").select("id, name, subjects(name)").order("name", { ascending: true }),
    ])

  if (examSetError) throw new Error(examSetError.message)
  if (!examSet) throw new Error("Шалгалтын багц олдсонгүй.")
  if (topicsError) throw new Error(topicsError.message)

  const topicListText = (topics ?? [])
    .map((topic) => `${joinedName(topic.subjects)} — ${topic.name}`)
    .join(", ")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Багц импорт — {examSet.title}</h1>
        <p className="text-muted-foreground">
          Текстээр олон асуултыг нэг дор оруулж, урьдчилан шалгаад импортлоно.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Форматын заавар (copy/paste)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-sm font-mono">
            {sampleFormat}
          </pre>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li><b>Сонголттой:</b> A) B) C) D) (E заавал биш) + <code>ANSWER: C</code> (Латин эсвэл Кирилл үсэг).</li>
            <li><b>Задгай (нөхөх):</b> сонголт бичихгүй, зөвхөн <code>ANSWER: 25</code>. Тодорхой заахыг хүсвэл <code>TYPE: FILL</code> (эсвэл <code>TYPE: Задгай</code>); сонголттойг <code>TYPE: TEST</code>.</li>
            <li><b>Олон зөв хариулт:</b> <code>ANSWER:</code> мөрийг давтана. Том/жижиг үсэг, илүү зай, тоон тэнцүү утга (<code>0.5</code> = <code>.5</code>) өөрөө таарна.</li>
            <li><b>Хэсэг:</b> <code># Хэсэг 2 — Нэр</code> мөр. <b>Хэсгийн тайлбар:</b> түүний доор <code>NOTE: ...</code> — тухайн хэсэг дуустал сурагчдад харагдана.</li>
            <li>Асуултуудыг <code>---</code> эсвэл дугаарлалтаар (<code>1.</code>) таслана. Хариулт байхгүй нөхөх асуулт алдаа гэж тэмдэглэгдэнэ.</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Боломжит TOPIC утгууд: {topicListText || "Сэдэв алга"}
          </p>
        </CardContent>
      </Card>

      <BulkImportClient examSetId={examSetId} />
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import {
  createSubject,
  createTopic,
  deleteSubject,
  deleteTopic,
  updateSubject,
} from "./_actions"
import { SubjectCrudCard } from "./_components"

export const dynamic = "force-dynamic"

type SubjectRow = {
  id: string
  name: string
  description: string | null
  icon: string | null
  is_active: boolean
}

type TopicRow = {
  id: string
  name: string
  subject_id: string
}

export default async function SubjectsAdminPage() {
  const supabase = getSupabaseAdmin()

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, name, description, icon, is_active")
    .order("name", { ascending: true })

  if (subjectsError) {
    throw new Error(subjectsError.message)
  }

  const subjectRows = (subjects ?? []) as SubjectRow[]
  const subjectIds = subjectRows.map((subject) => subject.id)

  const { data: topics, error: topicsError } = subjectIds.length
    ? await supabase
        .from("topics")
        .select("id, name, subject_id")
        .in("subject_id", subjectIds)
        .order("name", { ascending: true })
    : { data: [], error: null }

  if (topicsError) {
    throw new Error(topicsError.message)
  }

  const topicMap = new Map<string, Array<{ id: string; name: string }>>()
  for (const topic of (topics ?? []) as TopicRow[]) {
    if (!topicMap.has(topic.subject_id)) {
      topicMap.set(topic.subject_id, [])
    }
    topicMap.get(topic.subject_id)!.push({ id: topic.id, name: topic.name })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Хичээл & Сэдэв</h1>
        <p className="text-muted-foreground">
          Хичээл болон сэдвийн мэдээллийг эндээс бүрэн удирдана.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Шинэ хичээл нэмэх</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSubject} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Хичээлийн нэр <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Жишээ: Математик"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Тайлбар
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Хичээлийн товч тайлбар..."
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="icon" className="text-sm font-medium">
                Icon (emoji эсвэл богино текст)
              </label>
              <Input
                id="icon"
                name="icon"
                maxLength={20}
                className="sm:max-w-xs"
                placeholder="📘"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked
                className="size-4 rounded border"
              />
              Идэвхтэй эсэх
            </label>
            <div>
              <Button type="submit">
                Хичээл үүсгэх
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Хичээлийн жагсаалт ({subjectRows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjectRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Одоогоор бүртгэлтэй хичээл алга.
            </p>
          ) : (
            subjectRows.map((subject) => (
              <SubjectCrudCard
                key={subject.id}
                subject={{
                  ...subject,
                  topics: topicMap.get(subject.id) ?? [],
                }}
                actions={{
                  updateSubject,
                  deleteSubject,
                  createTopic,
                  deleteTopic,
                }}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

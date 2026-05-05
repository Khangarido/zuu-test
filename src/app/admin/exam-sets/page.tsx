import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/server"
import {
  createExamSet,
  deleteExamSet,
  toggleExamSetActive,
  updateExamSet,
} from "./_actions"
import { ExamSetCrudCard, SubmitButton } from "./_components"

export const dynamic = "force-dynamic"

type SubjectRow = {
  id: string
  name: string
}

type ExamSetRow = {
  id: string
  title: string
  description: string | null
  subject_id: string
  duration_minutes: number
  price: number
  shuffle_questions: boolean
  is_active: boolean
  created_at: string
  subjects: { name: string } | { name: string }[] | null
}

export default async function ExamSetsAdminPage() {
  const supabase = await createClient()

  const [{ data: examSets, error: examSetsError }, { data: subjects, error: subjectsError }] =
    await Promise.all([
      supabase
        .from("exam_sets")
        .select(
          "id, title, description, subject_id, duration_minutes, price, shuffle_questions, is_active, created_at, subjects(name)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("subjects").select("id, name").order("name", { ascending: true }),
    ])

  if (examSetsError) throw new Error(examSetsError.message)
  if (subjectsError) throw new Error(subjectsError.message)

  const subjectOptions = ((subjects ?? []) as SubjectRow[]).map((subject) => ({
    id: subject.id,
    name: subject.name,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Шалгалтын багц</h1>
        <p className="text-muted-foreground">
          Шалгалтын багц үүсгэх, засах, идэвхжүүлэх болон устгах удирдлага.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Шинэ шалгалт нэмэх</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createExamSet} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Гарчиг <span className="text-destructive">*</span>
              </label>
              <Input
                id="title"
                name="title"
                required
                minLength={2}
                maxLength={200}
                placeholder="Жишээ: ЭЕШ Математик 2025 Тур 1"
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
                maxLength={1000}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Шалгалтын товч тайлбар..."
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="subject_id" className="text-sm font-medium">
                Хичээл <span className="text-destructive">*</span>
              </label>
              <select
                id="subject_id"
                name="subject_id"
                required
                defaultValue=""
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Хичээл сонгоно уу
                </option>
                {subjectOptions.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="duration_minutes" className="text-sm font-medium">
                  Хугацаа (минут)
                </label>
                <Input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  min={5}
                  max={300}
                  defaultValue={60}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="price" className="text-sm font-medium">
                  Үнэ (₮)
                </label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  defaultValue={0}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="shuffle_questions"
                  defaultChecked
                  className="size-4 rounded border"
                />
                Асуултыг санамсаргүй эрэмбэлэх
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked
                  className="size-4 rounded border"
                />
                Идэвхтэй эсэх
              </label>
            </div>
            <div>
              <SubmitButton pendingText="Үүсгэж байна...">Шалгалт үүсгэх</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Шалгалтын жагсаалт ({(examSets ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(examSets ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Одоогоор бүртгэлтэй шалгалтын багц алга.
            </p>
          ) : (
            ((examSets ?? []) as ExamSetRow[]).map((examSet) => (
              <ExamSetCrudCard
                key={examSet.id}
                examSet={{
                  ...examSet,
                  subject_name: Array.isArray(examSet.subjects)
                    ? examSet.subjects[0]?.name ?? "Хичээлгүй"
                    : examSet.subjects?.name ?? "Хичээлгүй",
                }}
                subjectOptions={subjectOptions}
                actions={{ updateExamSet, deleteExamSet, toggleExamSetActive }}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

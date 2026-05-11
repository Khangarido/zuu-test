import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { deleteQuestion, updateQuestion } from "./_actions"
import { ExamSetPicker, QuestionCrudCard, CreateQuestionForm } from "./_components"
import { Upload, HelpCircle, PlusCircle, Filter } from "lucide-react"

export const dynamic = "force-dynamic"

type SearchParams = {
  exam_set_id?: string
  topic_id?: string
}

type ExamSetRow = {
  id: string
  title: string
}

type TopicRow = {
  id: string
  name: string
  subjects: { name: string } | { name: string }[] | null
}

type QuestionRow = {
  id: string
  exam_set_id: string
  topic_id: string | null
  question_text: string
  difficulty: "easy" | "medium" | "hard"
  points: number
  order_index: number
  section_name: string | null
  explanation: string | null
  image_url: string | null
  created_at: string
  topics: { name: string } | { name: string }[] | null
  answer_options:
    | Array<{
        option_label: "A" | "B" | "C" | "D" | "E"
        option_text: string
        is_correct: boolean
        image_url?: string | null
      }>
    | null
}

function getJoinedName(joined: { name: string } | { name: string }[] | null) {
  return Array.isArray(joined)
    ? (joined[0]?.name ?? null)
    : (joined?.name ?? null)
}

export default async function QuestionsAdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const params = await Promise.resolve(searchParams ?? {})
  const selectedExamSetId = params.exam_set_id ?? ""
  const selectedTopicId = params.topic_id ?? ""
  const supabase = getSupabaseAdmin()

  const [
    { data: examSets, error: examSetsError },
    { data: topics, error: topicsError },
  ] = await Promise.all([
    supabase
      .from("exam_sets")
      .select("id, title")
      .order("created_at", { ascending: false }),
    supabase
      .from("topics")
      .select("id, name, subjects(name)")
      .order("name", { ascending: true }),
  ])

  if (examSetsError) throw new Error(examSetsError.message)
  if (topicsError) throw new Error(topicsError.message)

  const topicOptions = ((topics ?? []) as TopicRow[]).map((topic) => ({
    id: topic.id,
    name: topic.name,
    subject_name: getJoinedName(topic.subjects) ?? "Сэдэвгүй хичээл",
  }))

  let questions: QuestionRow[] = []
  if (selectedExamSetId) {
    let query = supabase
      .from("questions")
      .select(
        "id, exam_set_id, topic_id, question_text, difficulty, points, order_index, section_name, explanation, image_url, created_at, topics(name), answer_options(option_label, option_text, is_correct, image_url)"
      )
      .eq("exam_set_id", selectedExamSetId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true })

    if (selectedTopicId) {
      query = query.eq("topic_id", selectedTopicId)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    questions = (data ?? []) as QuestionRow[]
  }

  const groupedTopics = topicOptions.reduce(
    (acc, topic) => {
      if (!acc[topic.subject_name]) acc[topic.subject_name] = []
      acc[topic.subject_name].push(topic)
      return acc
    },
    {} as Record<string, typeof topicOptions>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Асуулт</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Шалгалтын асуулт, сонголт, зөв хариулт, тайлбарыг удирдана.
          </p>
        </div>
        {selectedExamSetId && (
          <Button asChild size="sm" variant="outline" className="shrink-0 cursor-pointer">
            <Link href={`/admin/questions/import?exam_set_id=${selectedExamSetId}`}>
              <Upload className="size-4" />
              Багц импорт
            </Link>
          </Button>
        )}
      </div>

      {/* Exam set + topic filter */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Шалгалтаар шүүх</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExamSetPicker
            examSets={(examSets ?? []) as ExamSetRow[]}
            selectedExamSetId={selectedExamSetId}
          />

          {selectedExamSetId && (
            <form method="get" className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="exam_set_id" value={selectedExamSetId} />
              <div className="flex-1 min-w-[200px] space-y-1">
                <label
                  htmlFor="topic_id"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Сэдвээр нэмэлт шүүх
                </label>
                <select
                  id="topic_id"
                  name="topic_id"
                  defaultValue={selectedTopicId}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  <option value="">Бүх сэдэв</option>
                  {topicOptions.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.subject_name} — {topic.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="sm" variant="outline" className="cursor-pointer">
                Шүүх
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {!selectedExamSetId ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <HelpCircle className="size-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium">Шалгалт сонгоно уу</p>
              <p className="text-sm mt-1">
                Асуултын жагсаалтыг харахын тулд эхлээд шалгалтын багц сонгоно уу.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Create form */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="size-4 text-primary" />
                <CardTitle className="text-base">Шинэ асуулт нэмэх</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CreateQuestionForm
                examSetId={selectedExamSetId}
                selectedTopicId={selectedTopicId}
                groupedTopics={groupedTopics}
              />
            </CardContent>
          </Card>

          {/* Question list */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Асуултын жагсаалт</CardTitle>
                <Badge variant="secondary" className="rounded-full">
                  {questions.length} асуулт
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {questions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                  <HelpCircle className="size-8 text-muted-foreground/40" />
                  <p className="text-sm">Сонгосон шүүлтэд тохирох асуулт олдсонгүй.</p>
                </div>
              ) : (
                questions.map((question) => (
                  <QuestionCrudCard
                    key={question.id}
                    question={{
                      ...question,
                      section_name: question.section_name ?? null,
                      topic_name: getJoinedName(question.topics),
                      image_url: question.image_url ?? null,
                      answer_options: (question.answer_options ?? []) as Array<{
                        option_label: "A" | "B" | "C" | "D" | "E"
                        option_text: string
                        is_correct: boolean
                        image_url?: string | null
                      }>,
                    }}
                    topicOptions={topicOptions}
                    actions={{ updateQuestion, deleteQuestion }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

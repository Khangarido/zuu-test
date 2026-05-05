"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { parseQuestions } from "@/lib/parse-questions"

type OptionLabel = "A" | "B" | "C" | "D" | "E"

type ImportQuestion = {
  question_text: string
  options: { A: string; B: string; C: string; D: string; E: string }
  correct: OptionLabel
  question_type: "multiple_choice" | "fill_in"
  correct_answer: string
  difficulty: "easy" | "medium" | "hard"
  topic_name: string
  section_name: string
  explanation: string
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Нэвтрээгүй хэрэглэгч байна.")
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!profile || profile.role !== "admin") throw new Error("Зөвхөн админ хэрэглэгч энэ үйлдлийг хийх боломжтой.")
  return supabase
}

function resolveTopicId(
  topicName: string,
  topicMatching: "strict" | "fuzzy" | "none",
  exactTopicMap: Map<string, string>
): string | null {
  if (!topicName.trim() || topicMatching === "none") return null
  const norm = topicName.trim().toLowerCase()
  if (topicMatching === "strict") return exactTopicMap.get(norm) ?? null
  for (const [name, id] of exactTopicMap.entries()) {
    if (name.includes(norm) || norm.includes(name)) return id
  }
  return null
}

export async function bulkImportParsed(
  examSetId: string,
  questionsJson: string,
  topicMatching: "strict" | "fuzzy" | "none"
) {
  const supabase = await requireAdmin()
  if (!examSetId) return { inserted: 0, dbError: "Шалгалтын багц сонгоно уу." }

  let questions: ImportQuestion[]
  try {
    questions = JSON.parse(questionsJson) as ImportQuestion[]
  } catch {
    return { inserted: 0, dbError: "Асуултуудыг задлах үед алдаа гарлаа." }
  }
  if (!Array.isArray(questions) || questions.length === 0) return { inserted: 0, dbError: null }

  const { data: examSet, error: examSetError } = await supabase
    .from("exam_sets").select("id, subject_id").eq("id", examSetId).maybeSingle()
  if (examSetError || !examSet) return { inserted: 0, dbError: examSetError?.message ?? "Шалгалтын багц олдсонгүй." }

  const { data: topics, error: topicsError } = await supabase.from("topics").select("id, name")
  if (topicsError) return { inserted: 0, dbError: topicsError.message }

  const exactTopicMap = new Map<string, string>()
  for (const topic of topics ?? []) exactTopicMap.set(topic.name.trim().toLowerCase(), topic.id)

  const questionIds: string[] = questions.map(() => crypto.randomUUID())

  const rows = questions.map((q, i) => ({
    id: questionIds[i],
    exam_set_id: examSet.id,
    topic_id: resolveTopicId(q.topic_name ?? "", topicMatching, exactTopicMap),
    subject_id: examSet.subject_id,
    question_text: q.question_text,
    difficulty: q.difficulty,
    order_index: i + 1,
    section_name: q.section_name?.trim() || null,
    question_type: q.question_type ?? "multiple_choice",
    correct_answer: q.question_type === "fill_in" ? (q.correct_answer?.trim() || null) : null,
    explanation: q.explanation?.trim() || null,
  }))

  const { error: insertQuestionsError } = await supabase.from("questions").insert(rows)
  if (insertQuestionsError) return { inserted: 0, dbError: insertQuestionsError.message }

  // Only insert options for multiple-choice questions
  const mcQuestions = questions.filter((q) => q.question_type !== "fill_in")
  if (mcQuestions.length > 0) {
    const optionRows = questions.flatMap((q, i) => {
      if (q.question_type === "fill_in") return []
      const questionId = questionIds[i]
      const base = (["A", "B", "C", "D"] as OptionLabel[]).map((label) => ({
        question_id: questionId,
        option_label: label,
        option_text: q.options[label],
        is_correct: q.correct === label,
      }))
      if (q.options.E?.trim()) {
        base.push({ question_id: questionId, option_label: "E", option_text: q.options.E, is_correct: q.correct === "E" })
      }
      return base
    })

    if (optionRows.length > 0) {
      const { error: insertOptionsError } = await supabase.from("answer_options").insert(optionRows)
      if (insertOptionsError) {
        await supabase.from("questions").delete().in("id", questionIds)
        return { inserted: 0, dbError: insertOptionsError.message }
      }
    }
  }

  revalidatePath("/admin/questions")
  return { inserted: questions.length, dbError: null }
}

export async function bulkImportQuestions(
  examSetId: string,
  rawText: string,
  topicMatching: "strict" | "fuzzy" | "none"
) {
  const supabase = await requireAdmin()
  const { questions, errors } = parseQuestions(rawText)
  if (!examSetId) return { inserted: 0, parseErrors: errors, dbError: "Шалгалтын багц сонгоно уу." }
  if (questions.length === 0) return { inserted: 0, parseErrors: errors, dbError: null }

  const { data: examSet, error: examSetError } = await supabase
    .from("exam_sets").select("id, subject_id").eq("id", examSetId).maybeSingle()
  if (examSetError || !examSet) return { inserted: 0, parseErrors: errors, dbError: examSetError?.message ?? "Шалгалтын багц олдсонгүй." }

  const { data: topics, error: topicsError } = await supabase.from("topics").select("id, name")
  if (topicsError) return { inserted: 0, parseErrors: errors, dbError: topicsError.message }

  const exactTopicMap = new Map<string, string>()
  for (const topic of topics ?? []) exactTopicMap.set(topic.name.trim().toLowerCase(), topic.id)

  const questionIds: string[] = questions.map(() => crypto.randomUUID())

  const rows = questions.map((q, i) => ({
    id: questionIds[i],
    exam_set_id: examSet.id,
    topic_id: resolveTopicId(q.topic_name ?? "", topicMatching, exactTopicMap),
    subject_id: examSet.subject_id,
    question_text: q.question_text,
    difficulty: q.difficulty,
    order_index: i + 1,
    section_name: q.section_name?.trim() || null,
    question_type: q.question_type ?? "multiple_choice",
    correct_answer: q.question_type === "fill_in" ? (q.correct_answer?.trim() || null) : null,
    explanation: q.explanation ?? null,
  }))

  const { error: insertQuestionsError } = await supabase.from("questions").insert(rows)
  if (insertQuestionsError) return { inserted: 0, parseErrors: errors, dbError: insertQuestionsError.message }

  const optionRows = questions.flatMap((q, i) => {
    if (q.question_type === "fill_in") return []
    const questionId = questionIds[i]
    const base = [
      { question_id: questionId, option_label: "A", option_text: q.options.A, is_correct: q.correct === "A" },
      { question_id: questionId, option_label: "B", option_text: q.options.B, is_correct: q.correct === "B" },
      { question_id: questionId, option_label: "C", option_text: q.options.C, is_correct: q.correct === "C" },
      { question_id: questionId, option_label: "D", option_text: q.options.D, is_correct: q.correct === "D" },
    ]
    if (q.options.E) base.push({ question_id: questionId, option_label: "E", option_text: q.options.E, is_correct: q.correct === "E" })
    return base
  })

  if (optionRows.length > 0) {
    const { error: insertOptionsError } = await supabase.from("answer_options").insert(optionRows)
    if (insertOptionsError) {
      await supabase.from("questions").delete().in("id", questionIds)
      return { inserted: 0, parseErrors: errors, dbError: insertOptionsError.message }
    }
  }

  revalidatePath("/admin/questions")
  return { inserted: questions.length, parseErrors: errors, dbError: null }
}

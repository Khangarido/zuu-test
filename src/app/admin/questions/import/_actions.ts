"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
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
  if (!profile || !["admin", "superadmin"].includes(profile.role)) throw new Error("Зөвхөн админ хэрэглэгч энэ үйлдлийг хийх боломжтой.")
  return getSupabaseAdmin()
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

  const optionRows = questions.flatMap((q, i) => {
    if (q.question_type === "fill_in") return []
    const questionId = questionIds[i]
    return (["A","B","C","D","E"] as OptionLabel[]).filter(l => q.options[l]?.trim()).map(label => ({
      question_id: questionId,
      option_label: label,
      option_text: q.options[label],
      is_correct: q.correct === label,
    }))
  })

  if (optionRows.length > 0) {
    const { error: insertOptionsError } = await supabase.from("answer_options").insert(optionRows)
    if (insertOptionsError) {
      await supabase.from("questions").delete().in("id", questionIds)
      return { inserted: 0, dbError: insertOptionsError.message }
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
    return (["A","B","C","D","E"] as OptionLabel[]).filter(l => q.options[l]?.trim()).map(label => ({
      question_id: questionId,
      option_label: label,
      option_text: q.options[label],
      is_correct: q.correct === label,
    }))
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

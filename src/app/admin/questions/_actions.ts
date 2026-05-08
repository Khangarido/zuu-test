"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const difficultySchema = z.enum(["easy", "medium", "hard"])
const optionLabelSchema = z.enum(["A", "B", "C", "D", "E"])

const questionSchema = z.object({
  exam_set_id: z.string().uuid("Шалгалтын багц буруу байна."),
  topic_id: z.string().uuid().optional(),
  question_text: z.string().trim().min(5).max(2000),
  difficulty: difficultySchema,
  order_index: z.number().int(),
  section_name: z.string().trim().max(100).optional(),
  option_a: z.string().trim().min(1).max(500),
  option_b: z.string().trim().min(1).max(500),
  option_c: z.string().trim().min(1).max(500),
  option_d: z.string().trim().min(1).max(500),
  option_e: z.string().trim().max(500).optional(),
  correct_option: optionLabelSchema,
  explanation: z.string().trim().max(2000).optional(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Нэвтрээгүй хэрэглэгч байна.")
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!profile || !["admin", "superadmin"].includes(profile.role)) throw new Error("Зөвхөн админ хэрэглэгч энэ үйлдлийг хийх боломжтой.")
  return supabase
}

function normalizeOptional(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return NaN
  const trimmed = value.trim()
  if (!trimmed) return 0
  return Number(trimmed)
}

type ParsedQuestion = z.infer<typeof questionSchema> & { subject_id: string | null }

async function parseQuestionForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData
): Promise<ParsedQuestion> {
  const rawTopicId = normalizeOptional(formData.get("topic_id"))
  const parsed = questionSchema.safeParse({
    exam_set_id: formData.get("exam_set_id"),
    topic_id: rawTopicId,
    question_text: formData.get("question_text"),
    difficulty: formData.get("difficulty"),
    order_index: parseNumber(formData.get("order_index")),
    section_name: normalizeOptional(formData.get("section_name")),
    option_a: formData.get("option_a"),
    option_b: formData.get("option_b"),
    option_c: formData.get("option_c"),
    option_d: formData.get("option_d"),
    option_e: normalizeOptional(formData.get("option_e")),
    correct_option: formData.get("correct_option"),
    explanation: normalizeOptional(formData.get("explanation")),
  })
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Асуултын мэдээлэл буруу байна.")

  const data = parsed.data
  let subjectId: string | null = null
  if (data.topic_id) {
    const { data: topic, error: topicError } = await supabase.from("topics").select("subject_id").eq("id", data.topic_id).maybeSingle()
    if (topicError) throw new Error(topicError.message)
    if (!topic) throw new Error("Сонгосон сэдэв олдсонгүй.")
    subjectId = topic.subject_id
  }
  return { ...data, subject_id: subjectId }
}

function getOptionImageUrls(formData: FormData): Record<string, string | null> {
  const labels = ["a", "b", "c", "d", "e"]
  const result: Record<string, string | null> = {}
  for (const lc of labels) {
    result[lc.toUpperCase()] = normalizeOptional(formData.get(`option_${lc}_image_url`)) ?? null
  }
  return result
}

export async function createQuestion(formData: FormData) {
  const supabase = await requireAdmin()
  const payload = await parseQuestionForm(supabase, formData)
  const imageUrl = normalizeOptional(formData.get("image_url")) ?? null
  const optionImageUrls = getOptionImageUrls(formData)

  const { data: insertedQuestion, error: questionError } = await supabase
    .from("questions")
    .insert({
      exam_set_id: payload.exam_set_id,
      topic_id: payload.topic_id ?? null,
      subject_id: payload.subject_id,
      question_text: payload.question_text,
      difficulty: payload.difficulty,
      order_index: payload.order_index,
      section_name: payload.section_name ?? null,
      explanation: payload.explanation ?? null,
      image_url: imageUrl,
    })
    .select("id")
    .single()

  if (questionError || !insertedQuestion) throw new Error(questionError?.message ?? "Асуулт үүсгэх үед алдаа гарлаа.")

  const optionsPayload = [
    { question_id: insertedQuestion.id, option_label: "A", option_text: payload.option_a, is_correct: payload.correct_option === "A", image_url: optionImageUrls["A"] },
    { question_id: insertedQuestion.id, option_label: "B", option_text: payload.option_b, is_correct: payload.correct_option === "B", image_url: optionImageUrls["B"] },
    { question_id: insertedQuestion.id, option_label: "C", option_text: payload.option_c, is_correct: payload.correct_option === "C", image_url: optionImageUrls["C"] },
    { question_id: insertedQuestion.id, option_label: "D", option_text: payload.option_d, is_correct: payload.correct_option === "D", image_url: optionImageUrls["D"] },
    ...(payload.option_e
      ? [{ question_id: insertedQuestion.id, option_label: "E", option_text: payload.option_e, is_correct: payload.correct_option === "E", image_url: optionImageUrls["E"] }]
      : []),
  ]

  const { error: optionsError } = await supabase.from("answer_options").insert(optionsPayload)
  if (optionsError) {
    await supabase.from("questions").delete().eq("id", insertedQuestion.id)
    throw new Error(optionsError.message)
  }

  revalidatePath("/admin/questions")
}

export async function updateQuestion(id: string, formData: FormData) {
  if (!id) throw new Error("Асуултын ID олдсонгүй.")
  const supabase = await requireAdmin()
  const payload = await parseQuestionForm(supabase, formData)
  const imageUrl = normalizeOptional(formData.get("image_url")) ?? null
  const optionImageUrls = getOptionImageUrls(formData)

  const { error: questionError } = await supabase
    .from("questions")
    .update({
      exam_set_id: payload.exam_set_id,
      topic_id: payload.topic_id ?? null,
      subject_id: payload.subject_id,
      question_text: payload.question_text,
      difficulty: payload.difficulty,
      order_index: payload.order_index,
      section_name: payload.section_name ?? null,
      explanation: payload.explanation ?? null,
      image_url: imageUrl,
    })
    .eq("id", id)

  if (questionError) throw new Error(questionError.message)

  const { error: deleteError } = await supabase.from("answer_options").delete().eq("question_id", id)
  if (deleteError) throw new Error(deleteError.message)

  const optionsPayload = [
    { question_id: id, option_label: "A", option_text: payload.option_a, is_correct: payload.correct_option === "A", image_url: optionImageUrls["A"] },
    { question_id: id, option_label: "B", option_text: payload.option_b, is_correct: payload.correct_option === "B", image_url: optionImageUrls["B"] },
    { question_id: id, option_label: "C", option_text: payload.option_c, is_correct: payload.correct_option === "C", image_url: optionImageUrls["C"] },
    { question_id: id, option_label: "D", option_text: payload.option_d, is_correct: payload.correct_option === "D", image_url: optionImageUrls["D"] },
    ...(payload.option_e
      ? [{ question_id: id, option_label: "E", option_text: payload.option_e, is_correct: payload.correct_option === "E", image_url: optionImageUrls["E"] }]
      : []),
  ]

  const { error: insertError } = await supabase.from("answer_options").insert(optionsPayload)
  if (insertError) throw new Error(insertError.message)

  revalidatePath("/admin/questions")
}

export async function deleteQuestion(id: string) {
  if (!id) throw new Error("Асуултын ID олдсонгүй.")
  const supabase = await requireAdmin()
  const { error } = await supabase.from("questions").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/questions")
}

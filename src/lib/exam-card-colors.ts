export const DEFAULT_CARD_COLOR1 = "#FFF0F0"
export const DEFAULT_CARD_COLOR2 = "#FFE4E4"

export type ExamCardColors = {
  card_color1?: string | null
  card_color2?: string | null
}

export function resolveExamColors(exam: ExamCardColors) {
  const c1 = exam.card_color1?.trim() || DEFAULT_CARD_COLOR1
  const c2 = exam.card_color2?.trim() || DEFAULT_CARD_COLOR2
  return {
    c1,
    c2,
    gradient: `linear-gradient(145deg, ${c1}, ${c2})`,
    layer2: `${c2}99`,
    layer1: `${c2}99`,
    bubbleFill: `${c2}66`,
    bubbleStroke: `${c2}66`,
    border: `${c2}40`,
  }
}

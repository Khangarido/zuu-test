export type OptionLabel = "A" | "B" | "C" | "D" | "E"

export type ParsedQuestion = {
  question_text: string
  options: { A: string; B: string; C: string; D: string; E: string }
  correct: OptionLabel
  question_type: "multiple_choice" | "fill_in"
  correct_answer?: string
  explanation?: string
  difficulty: "easy" | "medium" | "hard"
  topic_name?: string
  section_name?: string
  section_note?: string
}

export type ParseError = {
  line: number
  message: string
}

// Map Cyrillic Mongolian option letters → Latin labels
const CYRILLIC_OPTION: Record<string, OptionLabel> = {
  А: "A", Б: "B", В: "C", Г: "D", Д: "E",
  а: "A", б: "B", в: "C", г: "D", д: "E",
}

// Everything that can appear in ANSWER: field → canonical label
const ANSWER_MAP: Record<string, OptionLabel> = {
  A: "A", B: "B", C: "C", D: "D", E: "E",
  a: "A", b: "B", c: "C", d: "D", e: "E",
  ...CYRILLIC_OPTION,
  "1": "A", "2": "B", "3": "C", "4": "D", "5": "E",
}

function normalizeDifficulty(input: string | undefined): "easy" | "medium" | "hard" {
  const v = (input ?? "medium").trim().toLowerCase()
  if (v === "easy" || v === "хялбар") return "easy"
  if (v === "hard" || v === "хүнд") return "hard"
  return "medium"
}

/** Insert newlines before keyword tokens so single-line pastes become multiline. */
function normalize(raw: string): string {
  const keywords = [
    "Q:", "ANSWER:", "EXPLANATION:", "DIFFICULTY:", "TOPIC:", "TYPE:", "NOTE:", "---",
    "A)", "B)", "C)", "D)", "E)",
    "A.", "B.", "C.", "D.", "E.",
    "А)", "Б)", "В)", "Г)", "Д)",
    "А.", "Б.", "В.", "Г.", "Д.",
  ]
  let result = raw
  for (const kw of keywords) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    result = result.replace(new RegExp(`([^\\n]) +(${esc})`, "g"), `$1\n$2`)
  }
  return result
}

function stripQuestionNumber(line: string): string | null {
  const stripped = line.replace(/^\s*\d+[.)]\s*/, "")
  // If nothing changed, it wasn't a numbered line
  if (stripped === line.trimStart()) return null
  return stripped.trim()
}

/** Split raw text into per-question chunks. */
function splitIntoChunks(raw: string): { chunk: string; startLine: number }[] {
  const lines = raw.split(/\r?\n/)
  const result: { chunk: string; startLine: number }[] = []
  const hasExplicit = lines.some((l) => /^-{3,}\s*$/.test(l))

  if (hasExplicit) {
    let cur: string[] = []
    let start = 1
    for (let i = 0; i < lines.length; i++) {
      if (/^-{3,}\s*$/.test(lines[i])) {
        result.push({ chunk: cur.join("\n"), startLine: start })
        cur = []
        start = i + 2
      } else {
        cur.push(lines[i])
      }
    }
    result.push({ chunk: cur.join("\n"), startLine: start })
    return result
  }

  // Auto-split on Q: lines OR numbered question lines (e.g. "1." / "1)")
  const NUMBERED_Q = /^\d+[.)]\s/
  let cur: string[] = []
  let start = 1
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart()
    const isNewQ = t.startsWith("Q:") || NUMBERED_Q.test(t)
    if (isNewQ && cur.some((l) => l.trim())) {
      result.push({ chunk: cur.join("\n"), startLine: start })
      cur = [lines[i]]
      start = i + 1
    } else {
      cur.push(lines[i])
    }
  }
  result.push({ chunk: cur.join("\n"), startLine: start })
  return result
}

const OPTION_PREFIXES_RE = /^([A-EА-Д])[).]/

function parseOptionLine(line: string): { label: OptionLabel; text: string } | null {
  const t = line.trimStart()
  const m = t.match(/^([A-EА-Да-д])[).] *(.*)$/)
  if (!m) return null
  const ch = m[1]
  // Latin
  if (/^[A-E]$/.test(ch)) return { label: ch as OptionLabel, text: m[2].trim() }
  // Cyrillic
  if (CYRILLIC_OPTION[ch]) return { label: CYRILLIC_OPTION[ch], text: m[2].trim() }
  return null
}

function startsWithAny(line: string, prefixes: string[]) {
  const t = line.trimStart()
  return prefixes.some((p) => t.startsWith(p))
}

const OPTION_PREFIXES = [
  "A)", "B)", "C)", "D)", "E)", "A.", "B.", "C.", "D.", "E.",
  "А)", "Б)", "В)", "Г)", "Д)", "А.", "Б.", "В.", "Г.", "Д.",
]
const META_PREFIXES = ["ANSWER:", "EXPLANATION:", "DIFFICULTY:", "TOPIC:", "TYPE:", "NOTE:"]
const ALL_PREFIXES = [...OPTION_PREFIXES, ...META_PREFIXES]

/** True if chunk has no option lines and no ANSWER — it's a preamble/section header. */
function isPreamble(lines: string[]): boolean {
  return lines
    .filter((l) => l.trim())
    .every((l) => !parseOptionLine(l) && !l.trimStart().startsWith("ANSWER:") && !l.trimStart().startsWith("TYPE:"))
}

/** TYPE: value → "fill_in" | "multiple_choice" | null (null = decide automatically). */
function parseTypeValue(v: string): "fill_in" | "multiple_choice" | null {
  const t = v.trim().toLowerCase()
  if (["fill", "fill_in", "fill-in", "fillin", "open", "text", "задгай", "нөхөх", "нөхөх асуулт", "задгай асуулт"].includes(t)) return "fill_in"
  if (["test", "choice", "mc", "multiple_choice", "multiple-choice", "сонголттой", "тест", "олон сонголт"].includes(t)) return "multiple_choice"
  return null
}

/** Extract section name from a # comment line */
function parseSectionLine(line: string): string | null {
  const t = line.trim()
  if (!t.startsWith("#")) return null
  return t
    .replace(/^#+\s*/, "")
    .replace(/^(SECTION|ХЭСЭГ)\s*\d*\s*[—\-]?\s*/i, "")
    .trim()
}

export function parseQuestions(raw: string): {
  questions: ParsedQuestion[]
  errors: ParseError[]
} {
  const questions: ParsedQuestion[] = []
  const errors: ParseError[] = []
  if (!raw.trim()) return { questions, errors }

  const chunks = splitIntoChunks(normalize(raw))
  let currentSection = ""
  let currentNote = ""

  for (const { chunk, startLine } of chunks) {
    if (!chunk.trim()) continue

    const allLines = chunk.split(/\r?\n/)

    // Peel off leading # section header lines
    let chunkStart = 0
    for (let i = 0; i < allLines.length; i++) {
      const sec = parseSectionLine(allLines[i])
      if (sec !== null) {
        if (sec) { currentSection = sec; currentNote = "" } // a new section starts without the old note
        chunkStart = i + 1
      } else if (allLines[i].trimStart().startsWith("NOTE:")) {
        // section note: shown to students above this section's questions
        currentNote = allLines[i].trimStart().slice(5).trim()
        chunkStart = i + 1
      } else if (allLines[i].trim()) {
        break
      } else {
        chunkStart = i + 1 // skip blank lines before first content
      }
    }

    const lines = allLines.slice(chunkStart)
    if (!lines.some((l) => l.trim())) continue // nothing after header

    // Skip preamble/section-title-only chunks silently
    if (isPreamble(lines)) continue

    let idx = 0
    const fail = (msg: string) => errors.push({ line: startLine, message: msg })
    const read = () => (idx < lines.length ? lines[idx] : "")

    // Skip leading blanks
    while (idx < lines.length && !read().trim()) idx++
    if (idx >= lines.length) continue

    let questionText = ""
    const options: Partial<Record<OptionLabel, string>> = {}
    let correct: OptionLabel | undefined
    const rawAnswers: string[] = []
    let forcedType: "fill_in" | "multiple_choice" | null = null
    let explanation = ""
    let difficulty: "easy" | "medium" | "hard" = "medium"
    let topicName = ""

    const qLine = read().trimStart()

    if (qLine.startsWith("Q:")) {
      questionText = qLine.slice(2).trim()
      idx++
    } else {
      const stripped = stripQuestionNumber(qLine)
      if (stripped === null) {
        // Can't detect question start — skip silently (likely preamble)
        continue
      }
      questionText = stripped
      idx++
    }

    // Multi-line question text
    while (idx < lines.length) {
      const line = read()
      if (startsWithAny(line, ALL_PREFIXES)) break
      if (parseOptionLine(line)) break
      if (!line.trim() && options.A) break // blank line after options started means we're done
      questionText += (questionText ? "\n" : "") + line.trimEnd()
      idx++
    }
    questionText = questionText.trimEnd()

    // Options A-E
    while (idx < lines.length) {
      const line = read()
      const opt = parseOptionLine(line)
      if (!opt) break
      options[opt.label] = opt.text
      idx++
    }

    // Metadata
    while (idx < lines.length) {
      const line = read().trimStart()
      if (!line) { idx++; continue }
      if (line.startsWith("ANSWER:")) {
        const v = line.slice(7).trim()
        // Try exact, then uppercase — if no mapping, it is a text answer (fill-in)
        if (rawAnswers.length === 0) {
          correct = ANSWER_MAP[v] ?? ANSWER_MAP[v.toUpperCase()] ?? ANSWER_MAP[v[0]]
        }
        // Repeating ANSWER: lines adds more accepted answers for a fill-in question
        if (v) rawAnswers.push(v)
        idx++; continue
      }
      if (line.startsWith("TYPE:")) {
        forcedType = parseTypeValue(line.slice(5))
        if (forcedType === null) fail(`TYPE: "${line.slice(5).trim()}" таниагдсангүй (FILL эсвэл TEST).`)
        idx++; continue
      }
      if (line.startsWith("NOTE:")) { idx++; continue }
      if (line.startsWith("DIFFICULTY:")) {
        difficulty = normalizeDifficulty(line.slice(11))
        idx++; continue
      }
      if (line.startsWith("TOPIC:")) {
        topicName = line.slice(6).trim()
        idx++; continue
      }
      if (line.startsWith("EXPLANATION:")) {
        explanation = line.slice(12).trim()
        idx++
        while (idx < lines.length) {
          const next = read()
          if (startsWithAny(next, ["DIFFICULTY:", "TOPIC:", "ANSWER:"])) break
          explanation += (explanation ? "\n" : "") + next.trimEnd()
          idx++
        }
        continue
      }
      idx++
    }

    // Validate
    if (!questionText.trim()) { fail("Асуултын текст хоосон байна."); continue }

    const hasAnyOption = options.A || options.B || options.C || options.D || options.E
    const isFillIn = forcedType === "fill_in" || (forcedType === null && !hasAnyOption)
    if (isFillIn) {
      const accepted = rawAnswers.join("\n")
      if (!accepted.trim()) { fail("Нөхөх асуултад ANSWER: заавал байна."); continue }
      questions.push({
        question_text: questionText.trim(),
        options: { A: "", B: "", C: "", D: "", E: "" },
        correct: "A", // placeholder — not used for fill_in
        question_type: "fill_in",
        correct_answer: accepted, // one accepted answer per line
        explanation: explanation.trim() || undefined,
        difficulty,
        topic_name: topicName.trim() || undefined,
        section_name: currentSection || undefined,
        section_note: currentNote || undefined,
      })
      continue
    }

    const filledLabels = (["A","B","C","D","E"] as OptionLabel[]).filter(l => options[l]?.trim())
    if (filledLabels.length < 2) { fail("Хамгийн багадаа 2 сонголт байна."); continue }
    if (!correct) { fail("ANSWER: заавал байна."); continue }
    if (!options[correct]?.trim()) { fail(`"${correct}" сонголтын текст хоосон байна.`); continue }

    questions.push({
      question_text: questionText.trim(),
      options: {
        A: (options.A ?? "").trim(),
        B: (options.B ?? "").trim(),
        C: (options.C ?? "").trim(),
        D: (options.D ?? "").trim(),
        E: (options.E ?? "").trim(),
      },
      correct,
      question_type: "multiple_choice",
      explanation: explanation.trim() || undefined,
      difficulty,
      topic_name: topicName.trim() || undefined,
      section_name: currentSection || undefined,
      section_note: currentNote || undefined,
    })
  }

  return { questions, errors }
}

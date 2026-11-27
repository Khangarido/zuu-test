/**
 * Fill-in ("нөхөх") answer checking. Used by submit, auto-submit of expired attempts and the
 * results page, so a student is graded the same way everywhere.
 *
 * `correct_answer` holds one accepted answer per LINE. A single-line value (every existing
 * question) behaves exactly as before: compared ignoring case and extra spaces. Extra lines add
 * alternative accepted answers, e.g. "0.5" / "1/2". Numbers also match across decimal comma/dot
 * and trailing zeros: "3,50" = "3.5". A newline never occurs inside one answer, so answers
 * containing | ; / etc. (|x|, 1/2, 2; 3) stay unambiguous.
 */

function clean(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase()
}

function asNumber(s: string): number | null {
  const t = s.replace(/\s+/g, "").replace(",", ".")
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Accepted answers, one per non-empty line, in their original spelling. */
export function acceptedAnswerList(correct: string | null | undefined): string[] {
  return (correct ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function isFillInCorrect(
  student: string | null | undefined,
  correct: string | null | undefined
): boolean {
  const s = clean(student ?? "")
  if (!s) return false
  const sn = asNumber(s)
  return acceptedAnswerList(correct).some((a) => {
    const c = clean(a)
    return c === s || (sn !== null && asNumber(c) === sn)
  })
}

/** For showing the accepted answers to a student on the results page. */
export function formatAcceptedAnswers(correct: string | null | undefined): string {
  return acceptedAnswerList(correct).join("  /  ")
}

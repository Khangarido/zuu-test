// Unit tests for the bulk-import parser. Run: npm test
import { parseQuestions } from "../src/lib/parse-questions.ts";
let bad = 0;
const t = (name, ok) => { console.log((ok ? "PASS" : "FAIL") + "  " + name); if (!ok) bad++; };

// 1. classic multiple-choice still works (Latin + Cyrillic answers)
{
  const { questions: q, errors } = parseQuestions(`Q: 2+2?\nA) 3\nB) 4\nC) 5\nD) 6\nANSWER: B\nDIFFICULTY: easy\n---\nQ: x?\nА. 1\nБ. 2\nANSWER: Б`);
  t("mc: 2 questions, no errors", q.length === 2 && errors.length === 0);
  t("mc: correct letters", q[0].correct === "B" && q[1].correct === "B");
  t("mc: type", q.every((x) => x.question_type === "multiple_choice"));
}

// 2. fill-in without options (automatic)
{
  const { questions: q, errors } = parseQuestions(`Q: 5*5=?\nANSWER: 25`);
  t("fill: auto-detected", q.length === 1 && q[0].question_type === "fill_in" && errors.length === 0);
  t("fill: answer kept", q[0].correct_answer === "25");
}

// 3. several accepted answers = repeated ANSWER lines, one per line
{
  const { questions: q } = parseQuestions(`Q: Монгол улсын нийслэл?\nTYPE: FILL\nANSWER: Улаанбаатар\nANSWER: УБ\nANSWER: Ulaanbaatar`);
  t("fill: multiple accepted answers", q[0].correct_answer === "Улаанбаатар\nУБ\nUlaanbaatar");
}

// 4. TYPE: задгай, answer that looks like an option letter stays text
{
  const { questions: q } = parseQuestions(`Q: Хариултаа бич.\nTYPE: Задгай\nANSWER: A`);
  t("fill: letter answer is text", q[0].question_type === "fill_in" && q[0].correct_answer === "A");
}

// 5. fill-in without an answer is an error (no more silent skip)
{
  const { questions: q, errors } = parseQuestions(`Q: no answer here\nTYPE: FILL`);
  t("fill: missing answer reported", q.length === 0 && errors.length === 1);
}

// 6. sections and notes
{
  const { questions: q } = parseQuestions(`# Хэсэг 1 — Тест\nNOTE: Нэг зөв хариулт сонго.\nQ: a?\nA) 1\nB) 2\nANSWER: A\n---\n# Хэсэг 2 — Нөхөх\nQ: b?\nANSWER: 7\n---\nQ: c?\nANSWER: 8\n---\n# Хэсэг 3\nNOTE: Хариултаа тоогоор бич.\nQ: d?\nANSWER: 9`);
  t("note: applies to section 1", q[0].section_note === "Нэг зөв хариулт сонго." && q[0].section_name === "Тест");
  t("note: reset on new section", q[1].section_note === undefined && q[1].section_name === "Нөхөх");
  t("note: not inherited within section without note", q[2].section_note === undefined);
  t("note: later section note", q[3].section_note === "Хариултаа тоогоор бич.");
}

// 7. unknown TYPE reported
{
  const { errors } = parseQuestions(`Q: x\nTYPE: banana\nANSWER: 1`);
  t("type: unknown value reported", errors.some((e) => e.message.includes("TYPE")));
}

console.log(bad ? `\n${bad} FAILED` : "\nALL PASS");
process.exit(bad ? 1 : 0);

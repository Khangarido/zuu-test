// Unit tests for fill-in grading. Run: npm test
import { isFillInCorrect as f, formatAcceptedAnswers as fmt, acceptedAnswerList as list } from "../src/lib/exam/grading.ts";
let bad = 0;
const t = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? "PASS" : "FAIL").padEnd(5), name, ok ? "" : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
// existing behaviour must not change
t("exact", f("Улаанбаатар", "Улаанбаатар"), true);
t("case + spaces (Cyrillic)", f("  УЛААНБААТАР ", "улаанбаатар"), true);
t("inner spaces collapsed", f("их   хурал", "их хурал"), true);
t("wrong", f("Дархан", "Улаанбаатар"), false);
t("empty student never correct", f("", "x"), false);
t("null student", f(null, "x"), false);
t("empty correct never matches", f("x", ""), false);
t("null correct", f("x", null), false);
// answers that contain separators stay literal
t("|x| literal", f("|x|", "|x|"), true);
t("|x| does not accept x", f("x", "|x|"), false);
t("fraction literal", f("1/2", "1/2"), true);
t("semicolon list literal", f("2; 3", "2; 3"), true);
t("semicolon list not partially accepted", f("2", "2; 3"), false);
// alternatives: one per line
t("alt line 1", f("0.5", "0.5\n1/2"), true);
t("alt line 2", f("1/2", "0.5\n1/2"), true);
t("alt CRLF", f("1/2", "0.5\r\n1/2"), true);
t("alt miss", f("0.4", "0.5\n1/2"), false);
// numbers
t("decimal comma", f("3,5", "3.5"), true);
t("trailing zero", f("3.50", "3.5"), true);
t("integer vs decimal", f("2.0", "2"), true);
t("negative", f("-4", "-4.0"), true);
t("number vs text not equal", f("3.5x", "3.5"), false);
t("different numbers", f("3.6", "3.5"), false);
t("thousands by space", f("1 000", "1000"), true);
t("display", fmt("0.5\n1/2\n\n"), "0.5  /  1/2");
t("list drops blanks", list("a\n\n  b \n"), ["a", "b"]);
console.log(bad ? `\n${bad} FAILED` : "\nALL PASS"); process.exit(bad ? 1 : 0);

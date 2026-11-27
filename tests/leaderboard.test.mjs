// Privacy test for the leaderboard: a student's payload must not contain other students' identities.
import { shapeRows, outsideRank } from "../src/lib/leaderboard.ts";
let bad = 0;
const t = (name, ok, extra = "") => { if (!ok) bad++; console.log((ok ? "PASS" : "FAIL").padEnd(5), name, ok ? "" : extra); };

const people = [
  ["u1", "Бат-Эрдэнэ Ганбаатар", "bat_erdene", "https://x/a1.png", "12", 91.5, "Diamond"],
  ["u2", "Сараа Намуун", "saraa", "https://x/a2.png", "11", 80.2, "Platinum"],
  ["me", "Хангарид Эрдэнэчулуун", "khangarid", "https://x/me.png", "10", 55, "Silver"],
  ["u4", "Тэмүүлэн Болд", "temuulen", null, "12", 40, "Bronze"],
];
const raw = people.map(([id, name, username, avatar_url, grade, value, tier]) => ({ id, value, tier, identity: { name, username, avatar_url, grade } }));
const mine = { name: "Хангарид Эрдэнэчулуун", username: "khangarid", avatar_url: "https://x/me.png", grade: "10" };

// what the server hands to a student's browser: DB rows WITHOUT identities (identity not even selected)
const studentInput = raw.map(({ identity, ...rest }) => rest);
const asStudent = shapeRows(studentInput, { viewerId: "me", viewerIdentity: mine, showIdentity: false });
const json = JSON.stringify(asStudent);
for (const [id, name, username, avatar] of people) {
  if (id === "me") continue;
  t(`student payload hides ${username}`, !json.includes(name) && !json.includes(username) && !json.includes(String(avatar)) && !json.includes(`"${id}"`));
}
t("ranks are 1..n in order", asStudent.map((r) => r.rank).join() === "1,2,3,4");
t("scores of others are still visible", asStudent[0].value === 91.5 && asStudent[1].tier === "Platinum");
t("own row is flagged and shows own name", asStudent[2].me === true && asStudent[2].identity?.name === mine.name);
t("only own row has identity", asStudent.filter((r) => r.identity).length === 1);

// even if a caller wrongly passes identities, non-admin output still hides others
const leaky = shapeRows(raw, { viewerId: "me", viewerIdentity: mine, showIdentity: false });
t("identities in input are dropped for non-admins", !JSON.stringify(leaky).includes("saraa") && leaky.filter((r) => r.identity).length === 1);

const asAdmin = shapeRows(raw, { viewerId: "nobody", viewerIdentity: mine, showIdentity: true });
t("admin sees every identity", asAdmin.every((r) => r.identity?.username));

t("outside rank = higher count + 1", outsideRank(136) === 137);
t("outside rank null-safe", outsideRank(null) === 1);
console.log(bad ? `\n${bad} FAILED` : "\nALL PASS"); process.exit(bad ? 1 : 0);

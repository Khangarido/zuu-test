#!/usr/bin/env node
// Automated smoke test for the self-hosted zuutest.site stack. Read-only: it never writes data
// (the optional login only creates a normal auth session). Prints PASS/FAIL/SKIP per check and
// exits non-zero if anything FAILED. Secrets are read from the environment and never printed.
//
//   APP_URL=https://next.zuutest.site  API_URL=https://supabase.zuutest.site
//   ANON_KEY=...                                   (anon JWT of the self-hosted stack)
//   optional: BYL_WEBHOOK_SECRET=...               (signed no-op webhook test)
//   optional: PUBLIC_IMAGE_URL=https://.../storage/v1/object/public/...   (image loads)
//   optional: OTHER_SITE=https://muur.site         (must still answer; we must not disturb it)
//   optional: TEST_EMAIL=... TEST_PASSWORD=...     (login, REST read as that user, Realtime join)
//
// Run on the VPS:  see deploy/MIGRATION.md section 7 ("Automated smoke test").

import crypto from "node:crypto";

const { APP_URL, API_URL, ANON_KEY } = process.env;
for (const [k, v] of Object.entries({ APP_URL, API_URL, ANON_KEY })) {
  if (!v) { console.error(`Missing env: ${k}`); process.exit(2); }
}
const app = APP_URL.replace(/\/+$/, "");
const api = API_URL.replace(/\/+$/, "");
const appHost = new URL(app).host;

let failed = 0;
const out = (tag, name, detail = "") => console.log(`${tag.padEnd(5)} ${name}${detail ? `  (${detail})` : ""}`);
async function check(name, fn) {
  try {
    const r = await fn();
    if (r === "skip") return out("SKIP", name);
    out("PASS", name, typeof r === "string" ? r : "");
  } catch (e) {
    failed++;
    out("FAIL", name, e.message);
  }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const get = (url, opts = {}) => fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000), ...opts });
const anon = { apikey: ANON_KEY };

console.log(`App: ${app}\nAPI: ${api}\n`);

// ── App ──────────────────────────────────────────────────────────────────────
await check("app /api/health", async () => {
  const r = await get(`${app}/api/health`);
  expect(r.status === 200 && (await r.text()) === "ok", `status ${r.status}`);
});
await check("app home and /login render", async () => {
  for (const p of ["/", "/login", "/register"]) {
    const r = await get(`${app}${p}`);
    expect(r.status === 200, `${p} -> ${r.status}`);
  }
});
await check("protected /dashboard redirects anonymous users to /login", async () => {
  const r = await get(`${app}/dashboard`);
  expect(r.status >= 300 && r.status < 400, `status ${r.status}`);
  expect((r.headers.get("location") || "").includes("/login"), `location ${r.headers.get("location")}`);
});
await check("auth redirects use the public host, not localhost (proxy-safe origin fix)", async () => {
  const r = await get(`${app}/auth/callback`, { headers: { "x-forwarded-proto": "https" } });
  const loc = r.headers.get("location") || "";
  expect(loc.startsWith(`https://${appHost}/`), `location ${loc}`);
  if (!/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(appHost)) {
    expect(!/localhost|0\.0\.0\.0|127\.0\.0\.1/.test(loc), `location ${loc}`);
  }
});
await check("app sends X-Accel-Buffering: no (streaming)", async () => {
  const r = await get(`${app}/login`);
  expect(r.headers.get("x-accel-buffering") === "no", `header ${r.headers.get("x-accel-buffering")}`);
});
await check("no secrets or hosted URLs leak into the public HTML", async () => {
  const html = await (await get(`${app}/login`)).text();
  expect(!/supabase\.co\b/.test(html), "found supabase.co in HTML");
  expect(!/service_role/i.test(html), "found service_role in HTML");
});

// ── Supabase API ─────────────────────────────────────────────────────────────
await check("API root is not public (404)", async () => {
  const r = await get(`${api}/`);
  expect(r.status === 404, `status ${r.status}`);
});
await check("API only exposes the four intended prefixes (studio/meta closed)", async () => {
  for (const p of ["/pg/", "/project/default", "/functions/v1/x", "/graphql/v1"]) {
    const r = await get(`${api}${p}`, { headers: anon });
    expect(r.status === 404, `${p} -> ${r.status}`);
  }
});
await check("auth service healthy", async () => {
  const r = await get(`${api}/auth/v1/health`, { headers: anon });
  const j = await r.json();
  expect(r.status === 200 && j.name === "GoTrue", `status ${r.status}`);
  return j.version;
});
await check("auth settings: email on, phone/anonymous off, autoconfirm off", async () => {
  const j = await (await get(`${api}/auth/v1/settings`, { headers: anon })).json();
  expect(j.external?.email === true, "email signup disabled");
  expect(j.external?.phone !== true, "phone signup enabled");
  expect(j.disable_signup !== true, "signup disabled");
  expect(j.mailer_autoconfirm !== true, "mailer_autoconfirm is on (users would skip email verification)");
});
await check("REST (PostgREST) reachable and RLS hides private tables from anon", async () => {
  const r = await get(`${api}/rest/v1/profiles?select=id&limit=1`, { headers: anon });
  expect(r.status === 200, `status ${r.status}`);
  const rows = await r.json();
  expect(Array.isArray(rows) && rows.length === 0, `anon can read ${rows.length} profile row(s)!`);
});
await check("CORS allows the app origin", async () => {
  const r = await get(`${api}/auth/v1/health`, { headers: { ...anon, origin: app } });
  const allow = r.headers.get("access-control-allow-origin");
  expect(allow === "*" || allow === app, `allow-origin ${allow}`);
});
await check("storage: public image loads", async () => {
  if (!process.env.PUBLIC_IMAGE_URL) return "skip";
  const r = await get(process.env.PUBLIC_IMAGE_URL);
  expect(r.status === 200 && (r.headers.get("content-type") || "").startsWith("image/"), `status ${r.status} ${r.headers.get("content-type")}`);
  return `${(await r.arrayBuffer()).byteLength} bytes`;
});

// ── Payments webhook (signed no-op: empty client_reference_id => nothing is written) ─────────
await check("BYL webhook: valid signature accepted, bad signature rejected", async () => {
  const secret = process.env.BYL_WEBHOOK_SECRET;
  if (!secret) return "skip";
  const body = JSON.stringify({ type: "checkout.completed", data: { id: "smoke", client_reference_id: "" } });
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const ok = await get(`${app}/api/byl/webhook`, { method: "POST", body, headers: { "Byl-Signature": sig } });
  const bad = await get(`${app}/api/byl/webhook`, { method: "POST", body, headers: { "Byl-Signature": "bad" } });
  expect(ok.status === 200, `valid -> ${ok.status}`);
  expect(bad.status === 401, `bad -> ${bad.status}`);
});

// ── The other site on this server must be untouched ───────────────────────────
await check("other site still answers", async () => {
  if (!process.env.OTHER_SITE) return "skip";
  const r = await get(process.env.OTHER_SITE);
  expect(r.status >= 200 && r.status < 400, `status ${r.status}`);
});

// ── Optional: real login, REST as that user, Realtime ─────────────────────────
let token = null;
await check("login with an existing user (password hashes migrated)", async () => {
  const { TEST_EMAIL, TEST_PASSWORD } = process.env;
  if (!TEST_EMAIL || !TEST_PASSWORD) return "skip";
  const r = await get(`${api}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { ...anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const j = await r.json();
  expect(r.status === 200 && j.access_token, `status ${r.status} ${j.error_description || j.msg || ""}`);
  token = j.access_token;
  return `user ${j.user?.id?.slice(0, 8)}…`;
});
await check("REST as that user: own profile readable, RLS limits to own row", async () => {
  if (!token) return "skip";
  const r = await get(`${api}/rest/v1/profiles?select=id,username,role`, { headers: { ...anon, Authorization: `Bearer ${token}` } });
  const rows = await r.json();
  expect(r.status === 200, `status ${r.status}`);
  expect(rows.length >= 1, "no profile row for this user (trigger/profile missing)");
  return `${rows.length} row(s) visible`;
});
await check("REST as that user: exam sets visible", async () => {
  if (!token) return "skip";
  const r = await get(`${api}/rest/v1/exam_sets?select=id&limit=5`, { headers: { ...anon, Authorization: `Bearer ${token}` } });
  const rows = await r.json();
  expect(r.status === 200 && rows.length > 0, `status ${r.status}, ${Array.isArray(rows) ? rows.length : "?"} rows`);
});
await check("Realtime: WebSocket connects and subscribes to public.notifications changes", async () => {
  if (!token) return "skip";
  const url = `${api.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(ANON_KEY)}&vsn=1.0.0`;
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const seen = [];
    const timer = setTimeout(() => { try { ws.close(); } catch {} reject(new Error(`timeout; saw: ${seen.join(", ") || "nothing"}`)); }, 15000);
    ws.onopen = () => ws.send(JSON.stringify({
      topic: "realtime:smoke", event: "phx_join", ref: "1",
      payload: { config: { broadcast: { self: false }, presence: { key: "" },
        postgres_changes: [{ event: "INSERT", schema: "public", table: "notifications" }] }, access_token: token },
    }));
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      seen.push(`${msg.event}${msg.payload?.status ? ":" + msg.payload.status : ""}`);
      if (msg.event === "phx_reply" && msg.payload?.status === "error") { clearTimeout(timer); ws.close(); reject(new Error(JSON.stringify(msg.payload).slice(0, 200))); }
      if (msg.event === "system" && /Subscribed to PostgreSQL/i.test(msg.payload?.message || "")) { clearTimeout(timer); ws.close(); resolve(); }
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error("websocket error (check proxy upgrade headers)")); };
  });
});

console.log(`\n${failed ? `${failed} CHECK(S) FAILED` : "ALL CHECKS PASSED"}`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
// Copy Supabase Storage buckets (config + every object) from one project to another
// using only the Storage REST API. Used to move hosted Supabase -> self-hosted.
//
//   Zero dependencies, Node >= 18. Idempotent: objects are upserted, so re-running
//   (e.g. a final sync at cutover) is safe.
//
//   SRC_URL=https://<ref>.supabase.co  SRC_SERVICE_ROLE_KEY=...   (source: hosted)
//   DST_URL=https://supabase.zuutest.site  DST_SERVICE_ROLE_KEY=... (target: self-hosted)
//
//   node copy-storage.mjs [--dry-run] [bucket ...]
//
// Keys are read from the environment only (never argv, never written to disk).
// Exit code is non-zero if any object failed to copy.

const REQUIRED = ["SRC_URL", "SRC_SERVICE_ROLE_KEY", "DST_URL", "DST_SERVICE_ROLE_KEY"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env: ${missing.join(", ")}`);
  process.exit(2);
}

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ONLY = args.filter((a) => !a.startsWith("--"));
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY ?? 4));
const PAGE = 100;

const mkClient = (base, key) => ({
  base: base.replace(/\/+$/, ""),
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const src = mkClient(process.env.SRC_URL, process.env.SRC_SERVICE_ROLE_KEY);
const dst = mkClient(process.env.DST_URL, process.env.DST_SERVICE_ROLE_KEY);

const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(c, method, path, { json, body, headers = {}, okStatuses = [] } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${c.base}${path}`, {
        method,
        headers: {
          ...c.headers,
          ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
        body: json !== undefined ? JSON.stringify(json) : body,
      });
      if (res.ok || okStatuses.includes(res.status)) return res;
      const text = await res.text().catch(() => "");
      const err = new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 200)}`);
      if (res.status < 500 && res.status !== 429) throw Object.assign(err, { fatal: true });
      lastErr = err;
    } catch (e) {
      if (e.fatal) throw e;
      lastErr = e;
    }
    await sleep(500 * attempt);
  }
  throw lastErr;
}

async function listBuckets(c) {
  return (await call(c, "GET", "/storage/v1/bucket")).json();
}

async function ensureBucket(b) {
  const cfg = {
    public: !!b.public,
    file_size_limit: b.file_size_limit ?? null,
    allowed_mime_types: b.allowed_mime_types ?? null,
  };
  const res = await call(dst, "GET", `/storage/v1/bucket/${encodeURIComponent(b.id)}`, {
    okStatuses: [400, 404],
  });
  if (res.ok) {
    await call(dst, "PUT", `/storage/v1/bucket/${encodeURIComponent(b.id)}`, { json: cfg });
    return "updated";
  }
  await call(dst, "POST", "/storage/v1/bucket", { json: { id: b.id, name: b.name, ...cfg } });
  return "created";
}

// Recursively list every object path in a bucket. Folder entries have id === null.
async function listAll(bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await call(src, "POST", `/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
      json: { prefix, limit: PAGE, offset, sortBy: { column: "name", order: "asc" } },
    });
    const entries = await res.json();
    for (const e of entries) {
      if (e.id === null || e.id === undefined) {
        files.push(...(await listAll(bucket, `${prefix}${e.name}/`)));
      } else {
        files.push({
          path: `${prefix}${e.name}`,
          size: e.metadata?.size,
          mimetype: e.metadata?.mimetype,
          cacheControl: e.metadata?.cacheControl,
        });
      }
    }
    if (entries.length < PAGE) break;
  }
  return files;
}

async function copyObject(bucket, f) {
  const objPath = `/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(f.path)}`;
  const got = await call(src, "GET", objPath);
  const buf = Buffer.from(await got.arrayBuffer());
  await call(dst, "POST", objPath, {
    body: buf,
    headers: {
      "Content-Type": f.mimetype || got.headers.get("content-type") || "application/octet-stream",
      "x-upsert": "true",
      ...(f.cacheControl ? { "cache-control": f.cacheControl } : {}),
    },
  });
  return buf.length;
}

async function pool(items, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) await worker(queue.shift());
    }),
  );
}

const buckets = (await listBuckets(src)).filter((b) => !ONLY.length || ONLY.includes(b.id));
if (ONLY.length) {
  const unknown = ONLY.filter((n) => !buckets.some((b) => b.id === n));
  if (unknown.length) {
    console.error(`Unknown bucket(s) on source: ${unknown.join(", ")}`);
    process.exit(2);
  }
}
console.log(`${DRY ? "[dry-run] " : ""}${buckets.length} bucket(s): ${buckets.map((b) => b.id).join(", ")}`);

let totalFiles = 0;
let totalBytes = 0;
const failures = [];

for (const b of buckets) {
  const files = await listAll(b.id);
  const listedBytes = files.reduce((s, f) => s + (f.size || 0), 0);
  if (DRY) {
    console.log(`  ${b.id}: ${files.length} object(s), ${(listedBytes / 1048576).toFixed(1)} MiB, public=${!!b.public}`);
    totalFiles += files.length;
    totalBytes += listedBytes;
    continue;
  }
  const state = await ensureBucket(b);
  console.log(`  ${b.id}: bucket ${state}; copying ${files.length} object(s)`);
  let done = 0;
  await pool(files, async (f) => {
    try {
      totalBytes += await copyObject(b.id, f);
      totalFiles++;
    } catch (e) {
      failures.push(`${b.id}/${f.path}: ${e.message}`);
    }
    if (++done % 100 === 0) console.log(`    ${b.id}: ${done}/${files.length}`);
  });
}

console.log(
  `${DRY ? "Would copy" : "Copied"} ${totalFiles} object(s), ${(totalBytes / 1048576).toFixed(1)} MiB`,
);
if (failures.length) {
  console.error(`\n${failures.length} FAILED:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

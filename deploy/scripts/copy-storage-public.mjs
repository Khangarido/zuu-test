#!/usr/bin/env node
// Copy objects from PUBLIC buckets of a hosted Supabase project to the self-hosted one,
// without needing any hosted API key. Use when the hosted project only has new-style
// sb_secret_ keys, which the hosted Storage API rejects (see copy-storage.mjs).
//
// Input (stdin): one "bucket/path/to/object" per line. Get it from the hosted DB:
//   psql "$SRC_DB_URL" -At -c "select bucket_id || '/' || name from storage.objects order by 1"
//
//   SRC_URL=https://<ref>.supabase.co          (source: public URLs, no key)
//   DST_URL=http://127.0.0.1:8100  DST_SERVICE_ROLE_KEY=eyJ...   (target: self-hosted service key)
//
//   node copy-storage-public.mjs [--dry-run] < objects.txt
//
// Every bucket seen is created on the target as PUBLIC if missing. Objects are upserted, so
// re-running is safe. Non-public buckets are not reachable this way (their downloads fail
// and are reported). Exit code is non-zero if anything failed.

import { readFileSync } from "node:fs";

for (const k of ["SRC_URL", "DST_URL", "DST_SERVICE_ROLE_KEY"]) {
  if (!process.env[k]) {
    console.error(`Missing env: ${k}`);
    process.exit(2);
  }
}
const DRY = process.argv.includes("--dry-run");
const src = process.env.SRC_URL.replace(/\/+$/, "");
const dst = process.env.DST_URL.replace(/\/+$/, "");
const dstHeaders = {
  apikey: process.env.DST_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${process.env.DST_SERVICE_ROLE_KEY}`,
};
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

const lines = readFileSync(0, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
const objects = lines.map((l) => {
  const i = l.indexOf("/");
  return { bucket: l.slice(0, i), path: l.slice(i + 1) };
});
if (!objects.length) {
  console.error("No objects on stdin.");
  process.exit(2);
}
console.log(`${DRY ? "[dry-run] " : ""}${objects.length} object(s) in ${[...new Set(objects.map((o) => o.bucket))].join(", ")}`);

const failures = [];
let bytes = 0;
let ok = 0;

async function ensureBucket(id) {
  const res = await fetch(`${dst}/storage/v1/bucket/${encodeURIComponent(id)}`, { headers: dstHeaders });
  if (res.ok) return;
  const create = await fetch(`${dst}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...dstHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ id, name: id, public: true }),
  });
  if (!create.ok) throw new Error(`create bucket ${id}: ${create.status} ${(await create.text()).slice(0, 200)}`);
  console.log(`  bucket ${id}: created (public)`);
}

if (!DRY) for (const b of new Set(objects.map((o) => o.bucket))) await ensureBucket(b);

for (const { bucket, path } of objects) {
  const label = `${bucket}/${path}`;
  try {
    const got = await fetch(`${src}/storage/v1/object/public/${encodeURIComponent(bucket)}/${enc(path)}`);
    if (!got.ok) throw new Error(`download ${got.status}`);
    const buf = Buffer.from(await got.arrayBuffer());
    if (!DRY) {
      const up = await fetch(`${dst}/storage/v1/object/${encodeURIComponent(bucket)}/${enc(path)}`, {
        method: "POST",
        headers: {
          ...dstHeaders,
          "Content-Type": got.headers.get("content-type") || "application/octet-stream",
          "x-upsert": "true",
        },
        body: buf,
      });
      if (!up.ok) throw new Error(`upload ${up.status} ${(await up.text()).slice(0, 150)}`);
    }
    bytes += buf.length;
    ok++;
  } catch (e) {
    failures.push(`${label}: ${e.message}`);
  }
}

console.log(`${DRY ? "Would copy" : "Copied"} ${ok}/${objects.length} object(s), ${(bytes / 1048576).toFixed(2)} MiB`);
if (failures.length) {
  console.error(`\n${failures.length} FAILED:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

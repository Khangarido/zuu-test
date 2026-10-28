# Migration runbook: Vercel + hosted Supabase → Contabo VPS (self-hosted)

Follow the sections **in order**. Nothing here changes the live site until [§8 Cutover](#8-cutover).
Everything before that is a rehearsal on `next.zuutest.site` against a copy of the data.

**Read this first**

- You run these commands; Claude has no access to the VPS, Vercel, Supabase or DNS. Do not paste
  secrets into chat, issues or commits. Secrets stay in shell variables (`read -rs`) or in
  mode-600 `.env` files on the VPS.
- **Users will be signed out once at cutover.** Password hashes (`auth.users.encrypted_password`) and
  identities carry over, so everyone logs in again with the same password, but sessions cannot
  carry over: the auth cookie is named after the API host (`sb-<first label>-auth-token`) and the
  host changes from `<ref>.supabase.co` to `supabase.zuutest.site`, and we deliberately use fresh
  JWT secrets for the new stack. Refresh tokens and sessions are therefore not migrated.
- Pending sign-ups (unverified users whose OTP is still in flight) lose their code at cutover; they
  tap “resend code”.
- Plan a window with **no exam in progress**. Expect ~30–60 minutes of care at cutover for a DB of
  a few hundred MB; the rehearsal tells you the real number.
- This runbook was written without access to your servers. Commands were checked for syntax and, where
  possible, executed against mocks/fakes; **the first real execution is your rehearsal in §3–§7**, so
  expect to fix small things then, not at cutover.

Terms: **HOSTED** = the current Supabase project. **VPS** = the Contabo server. Paths assume the
repo is at `/opt/zuu/app` and the Supabase stack at `/opt/zuu/supabase`.

---

## 1. Backup (before anything else)

First get the repo onto the VPS; the SQL helpers and scripts used below live in it (read-only so far,
nothing is started):

```bash
sudo install -d -o "$USER" /opt/zuu
git clone <this repo's URL> /opt/zuu/app && cd /opt/zuu/app && git checkout <this PR's branch, or main once merged>
```

### 1.1 Gather facts from HOSTED (read-only)

In the Supabase dashboard: **Project Settings → Database** for the Postgres version and region, and
**Connect → Session pooler** for the connection string (port **5432**, IPv4-friendly; the
transaction pooler on 6543 cannot be used for `pg_dump`). Then on the VPS:

```bash
sudo install -d -m 700 /var/backups/zuu/migration && cd /var/backups/zuu/migration
read -rsp 'HOSTED DB URL (session pooler, password URL-encoded): ' SRC_DB_URL; echo; export SRC_DB_URL
srcpg() { docker run --rm -i -e SRC_DB_URL postgres:17-alpine "$@"; }

cd /opt/zuu/app
srcpg sh -c 'psql "$SRC_DB_URL" -X -f -' < deploy/sql/preflight-hosted.sql | tee /var/backups/zuu/migration/preflight.txt
```

Check the output:

| Look at | Needed outcome |
|---|---|
| `version()` | Postgres **15 or 17**. The self-hosted image is 17 and can restore a 15 or 17 dump. A newer major than 17: stop and ask |
| `pg_extension` | Every extension used must exist on the target. Common ones (`uuid-ossp`, `pgcrypto`, `pg_stat_statements`) ship in the image. If you see `pg_cron`, `pg_net`, `pgsodium`, `vector` etc., check the app really uses them |
| triggers on `auth.users` | Expect `on_auth_user_created`. Anything else must be added to `deploy/sql/post-restore.sql` |
| realtime publication | Expect `notifications`; add any other table to `post-restore.sql` |
| custom roles / `has_pg_cron` | Both should be empty/false, otherwise plan to recreate them by hand |
| DB size, bucket sizes | These are the “DB size” numbers the PR asks for |

### 1.2 Take the backups

```bash
cd /var/backups/zuu/migration
# Full logical backup of HOSTED (custom format). This is your insurance policy, keep it.
srcpg sh -c 'pg_dump "$SRC_DB_URL" -Fc --no-owner' > hosted-full-$(date +%F).dump
ls -lh hosted-full-*.dump          # sanity: not 0 bytes
```

Also, off the VPS (laptop or a drive), keep:

- the dump above (`scp` it down; it contains password hashes and personal data, so encrypt at rest);
- a screenshot/export of HOSTED **Authentication → URL Configuration, Providers, Emails (templates),
  SMTP settings, Rate Limits**, **Database → Replication/Publications**, and **Storage → buckets
  (public flag, size limit, allowed MIME types)**;
- the Vercel environment variables (`vercel env pull .env.vercel` on your laptop; keep that file
  out of git and out of chat).

The HOSTED project and the Vercel project stay **untouched and running** until you decide to delete
them (see §9). That is the rollback.

---

## 2. Stand up Supabase and the app on the VPS under a temporary domain

### 2.1 DNS (new names only, no risk to the live site)

At your DNS provider:

| Record | Value | Note |
|---|---|---|
| `A supabase.zuutest.site` | VPS IPv4 | final API host, used from day one |
| `A next.zuutest.site` | VPS IPv4 | rehearsal app host, removed after cutover |
| `AAAA` for the above | VPS IPv6 only if it really serves HTTPS | otherwise skip, a wrong AAAA breaks things intermittently |
| **Lower the TTL of `zuutest.site` and `www`** (A/AAAA/CNAME) to **60–300 s, now** | | Do it at least one *old* TTL before cutover (e.g. if it is 3600 s, lower it ≥ 1 h earlier, ideally 24 h) |

```bash
dig +short A supabase.zuutest.site; dig +short A next.zuutest.site   # must show the VPS IP before TLS can issue
```

### 2.2 Inspect, then install Supabase

Do [`README.md` Step 0](./README.md#step-0-inspect-what-muursite-runs-first-do-this-before-anything-else)
now if you have not. Then:

```bash
cd /opt/zuu/app
SB_DIR=/opt/zuu/supabase API_HOST=supabase.zuutest.site SITE_URL=https://zuutest.site sh deploy/supabase/setup.sh
$EDITOR /opt/zuu/supabase/.env          # SMTP_PASS=<Resend API key>; edge network line if the proxy is in Docker
cd /opt/zuu/supabase && docker compose pull && docker compose up -d && docker compose ps
```

Run the local smoke test from [`supabase/README.md`](./supabase/README.md#install). Do **not** create test
users yet: the data import in §4 needs an empty `auth.users`. (If you did, reset: see §8 step 2.)

### 2.3 Reverse proxy (additive; muur.site keeps serving)

Use the file matching what owns 80/443 (table in [`README.md`](./README.md#which-proxy-file-do-i-use)).
Always test the config **before** reloading:

```bash
# Caddy on the host
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
# nginx on the host
sudo nginx -t && sudo systemctl reload nginx && sudo certbot --nginx -d next.zuutest.site -d supabase.zuutest.site
```

If validation fails, **do not reload**; muur.site is still running on the old config. Fix the snippet
or remove it. Then:

```bash
curl -si https://supabase.zuutest.site/auth/v1/health -H "apikey: $(grep '^ANON_KEY=' /opt/zuu/supabase/.env | cut -d= -f2-)" | head -1   # HTTP/2 200
curl -si https://supabase.zuutest.site/ | head -1                                                        # 404: only 4 paths are public
```

WebSocket check (Realtime) once the app is up is in §7.

### 2.4 The app

```bash
cd /opt/zuu/app
cp .env.example deploy/.env && chmod 600 deploy/.env && $EDITOR deploy/.env
```

Set in `deploy/.env`:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://supabase.zuutest.site` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` from `/opt/zuu/supabase/.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` from `/opt/zuu/supabase/.env` |
| `NEXT_PUBLIC_APP_URL` | `https://zuutest.site` (final URL; only used as the BYL return URL) |
| `BYL_*`, `UPSTASH_REDIS_*`, `RESEND_API_KEY` | unchanged, copy from Vercel |
| `APP_PORT` | `3100` (or the free port you chose) |

Get an image. **Preferred:** build in GitHub Actions (see §10) and set `APP_IMAGE=ghcr.io/<owner>/<repo>`.
**First time / fallback:** build here (`next build` peaks around **1.6 GB RAM**; it runs under `nice`,
but watch muur.site while it runs):

```bash
./deploy/scripts/deploy.sh           # builds from this checkout, starts, waits for healthy, rolls back on failure
curl -s https://next.zuutest.site/api/health        # ok
```

At this point the app talks to an **empty** database; that is expected.

---

## 3. Dump the data from HOSTED

Same `SRC_DB_URL` / `srcpg` as §1.1. Writes only under the migration directory.

```bash
cd /var/backups/zuu/migration && D=rehearsal-$(date +%F-%H%M) && mkdir "$D"

# 1. App schema + data. No owners (restored as `postgres`); publications are re-added by post-restore.sql.
srcpg sh -c 'pg_dump "$SRC_DB_URL" --schema=public --no-owner --no-publications --no-subscriptions' > "$D/public.sql"

# 2. Auth DATA ONLY (the target's GoTrue creates the tables). Carries auth.users (bcrypt password
#    hashes, verified-email state, metadata) and auth.identities. Deliberately NOT carried: sessions,
#    refresh tokens, pending OTPs, audit log, schema_migrations (the target manages its own).
srcpg sh -c 'pg_dump "$SRC_DB_URL" --data-only --schema=auth --no-owner \
  --exclude-table=auth.schema_migrations --exclude-table=auth.sessions --exclude-table=auth.refresh_tokens \
  --exclude-table=auth.mfa_amr_claims --exclude-table=auth.flow_state --exclude-table=auth.one_time_tokens \
  --exclude-table=auth.audit_log_entries' > "$D/auth-data.sql"

# 3. Storage policies (the dashboard-created ones are NOT in supabase/*.sql), as re-runnable SQL
srcpg sh -c 'psql "$SRC_DB_URL" -X -q -A -t -f -' < /opt/zuu/app/deploy/sql/export-storage-policies.sql > "$D/storage-policies.sql"

# 4. Row counts to compare after the restore
srcpg sh -c 'psql "$SRC_DB_URL" -X -A -t -F" " -f -' < /opt/zuu/app/deploy/sql/verify-counts.sql > "$D/counts.src"

ls -lh "$D"; wc -l "$D/storage-policies.sql" "$D/counts.src"
```

Read `storage-policies.sql` once: you should see policies for `avatars` and for each of the other three buckets
(`class-photos`, `medee-photos`, `question-images`). If you see none for a bucket the app uploads to, that bucket is
public-by-flag only, and uploads were allowed some other way: look at it in the HOSTED dashboard before moving on.

---

## 4. Restore into the VPS

> **Order matters.** `public` has foreign keys to `auth.users`, so auth data goes **first**. Triggers on `auth.users`
> are created **last**, so the restore does not re-fire the “create profile” trigger.

```bash
cd /var/backups/zuu/migration/$D       # the rehearsal directory from §3
dst() { docker exec -i supabase-db psql -X -v ON_ERROR_STOP=1 "$@"; }

# 4.1 auth data (triggers/FK checks off for the load)
{ echo "set session_replication_role = replica;"; cat auth-data.sql; } | dst -U postgres -d postgres --single-transaction -f -
#     If this says "permission denied to set parameter session_replication_role", repeat with -U supabase_admin.

# 4.2 public schema + data
dst -U postgres -d postgres --single-transaction -f - < public.sql

# 4.3 things that live outside `public`: the auth.users trigger and Realtime publication membership
dst -U supabase_admin -d postgres -f - < /opt/zuu/app/deploy/sql/post-restore.sql

# 4.4 make PostgREST pick up the new tables
dst -U postgres -d postgres -c "notify pgrst, 'reload schema'"

# 4.5 compare
dst -U postgres -d postgres -A -t -F" " -f - < /opt/zuu/app/deploy/sql/verify-counts.sql > counts.dst
diff counts.src counts.dst && echo "ROW COUNTS IDENTICAL"
```

**`supabase/*.sql` in the repo are not re-run.** They are the historical migrations that built the HOSTED schema
(`rls.sql` creates policies that already exist in the dump and would fail; `profile_fields.sql` would overwrite
`handle_new_user()` with an older version). The `public` dump is the source of truth. The only piece of those
files that lives outside `public` is the `on_auth_user_created` trigger, which `post-restore.sql` re-creates.
Sanity-check that the dump matches what the repo expects:

```bash
dst -U postgres -d postgres -A -t -c "select column_name from information_schema.columns where table_schema='public' and table_name='profiles' order by 1"
# expect: aimag age avatar_url first_name grade last_name rank_score rank_tier receive_emails role school sex subjects sum_district username …
dst -U postgres -d postgres -A -t -c "select count(*) from pg_policies where schemaname='public'"      # RLS policies came across
dst -U postgres -d postgres -A -t -c "select relname from pg_class where relrowsecurity and relnamespace='public'::regnamespace"   # RLS enabled
```

---

## 5. Storage: copy the files and rewrite stored URLs

Avatars, class photos, medee photos and question images are stored in the DB as **full public URLs**
(`https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>`), so both the files and those URLs must move.

### 5.1 Copy buckets + objects (API to API; idempotent)

Needs both service-role keys. Read them without echoing; they stay in the shell:

```bash
read -rsp 'HOSTED service_role key: ' SRC_SERVICE_ROLE_KEY; echo
export SRC_URL=https://<project-ref>.supabase.co  SRC_SERVICE_ROLE_KEY
export DST_URL=http://127.0.0.1:8100        # the local gateway: no TLS, no proxy body limit, no hairpin routing
export DST_SERVICE_ROLE_KEY=$(grep '^SERVICE_ROLE_KEY=' /opt/zuu/supabase/.env | cut -d= -f2-)

cs() { docker run --rm --network host -e SRC_URL -e SRC_SERVICE_ROLE_KEY -e DST_URL -e DST_SERVICE_ROLE_KEY \
        -v /opt/zuu/app/deploy/scripts:/s:ro node:22-alpine node /s/copy-storage.mjs "$@"; }
cs --dry-run          # lists buckets/object counts/sizes; writes nothing
cs                    # creates buckets (same public flag, size limit, MIME types) and uploads every object
```

It exits non-zero and lists any object that failed; re-run until clean. Object counts and sizes should match the
`storage objects per bucket` section of `preflight.txt`.

### 5.2 Rewrite the stored URLs

```bash
OLD=https://<project-ref>.supabase.co ; NEW=https://supabase.zuutest.site
rw() { docker exec -i supabase-db psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -v old=$OLD -v new=$NEW -v apply=$1 -f - < /opt/zuu/app/deploy/sql/rewrite-urls.sql; }
rw 0      # dry run: prints "NNNN schema.table.column" for every column that holds the old host
rw 1      # apply (single transaction)
rw 0      # verify: must report "0 value(s) would change"
```

It scans every text/varchar/jsonb/text[] column in `public` plus `auth.users` metadata and `auth.identities.identity_data`,
so URLs embedded in question text or markdown are caught too. Then spot-check a real one in a browser:

```bash
docker exec supabase-db psql -U postgres -At -c "select avatar_url from public.profiles where avatar_url like '%/storage/v1/object/public/%' limit 1"
# open that URL; it must show the image (served by supabase.zuutest.site)
```

Also grep your own content for hard-coded old URLs that are not in the database (e.g. in `public/`):
`grep -rn "supabase.co" public src` should print nothing (it prints nothing today).

---

## 6. Recreate Storage policies

Buckets and their settings were created by `copy-storage.mjs` in §5.1. Apply the policies exported in §3:

```bash
cd /var/backups/zuu/migration/$D
docker exec -i supabase-db psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -f - < storage-policies.sql
docker exec supabase-db psql -U postgres -d postgres -c "select policyname, cmd from pg_policies where schemaname='storage' order by 1"
```

(`drop policy if exists` precedes each `create policy`, so re-running is safe.) For reference, `supabase/profile_fields.sql`
defines the `avatars` ones: public insert, public read, and owner-only update/delete where the file name's first
segment equals `auth.uid()`; the exported file is authoritative because it also includes the other three buckets.

---

## 7. Swap env vars and test on `next.zuutest.site`

The app needs **no code change** to point at the new stack; only these variables differ from Vercel
(already set in §2.4): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
All other variables (BYL, Upstash, Resend) are unchanged. Vercel's environment is **not** touched; it keeps
pointing at HOSTED until you move DNS.

Optional latency tweak, **server-side hairpin**: the app's server calls the public API URL, which leaves through the
provider network and comes back. To keep that on the machine, uncomment `extra_hosts` in `deploy/docker-compose.app.yml`
(`"supabase.zuutest.site:host-gateway"`) after verifying it works, since the host firewall must allow the Docker bridge to reach
:443:

```bash
docker run --rm --add-host supabase.zuutest.site:host-gateway curlimages/curl -sS -o /dev/null -w '%{http_code}\n' \
  https://supabase.zuutest.site/auth/v1/health -H "apikey: $(grep '^ANON_KEY=' /opt/zuu/supabase/.env | cut -d= -f2-)"
# 200 → safe to enable; connection refused/timeout → leave it commented (or `ufw allow in on docker0 to any port 443`)
```

### Test checklist (all on `https://next.zuutest.site`; tick each)

| # | Test | Pass looks like |
|---|---|---|
| 1 | **Existing user login** (a real account, e.g. yours, with its HOSTED password) | Lands on `/dashboard`; profile, avatar, rank intact |
| 2 | **Registration**: new account with avatar | OTP email arrives (check spam), 6-digit code verifies, redirected to `/dashboard`, `public.profiles` row exists with username/grade/subjects |
| 3 | **Resend** code button on `/verify` | New email within seconds, 60 s cooldown still works |
| 4 | **Forgot password** | Email link → `https://next.zuutest.site/auth/callback?...` → `/auth/reset-password` (not `localhost`) → new password works |
| 5 | **Logout** | Back on the home page of the same host, cookie cleared (the `request-origin` fix) |
| 6 | **Exam flow**: start → answer → submit → results; leaderboard | Attempt rows written, rank updates, results page renders |
| 7 | **Realtime notification bell** | See below |
| 8 | **Uploads**: avatar (profile edit), class cover/photo, medee photo, question image (admin) | Upload succeeds; image shows at a `supabase.zuutest.site/storage/v1/object/public/...` URL |
| 9 | **Old images** from HOSTED render | Existing avatars/question images load (proves §5) |
| 10 | **Admin**: `/admin` pages, find user by email, set role | Works for admin; blocked for a student |
| 11 | **BYL checkout** | Redirects to BYL; *its return URL is `NEXT_PUBLIC_APP_URL` = the production URL*, so do not complete a real payment from `next.` |
| 12 | **BYL webhook** | See below |
| 13 | **Browser console / network** | No CORS errors, no failed `wss://supabase.zuutest.site/realtime/v1/websocket` |

**Realtime (7).** Open `/dashboard` as user A in two tabs. In tab 1 submit an exam (the submit route inserts a row into
`notifications` for A via the service role). Tab 2's bell badge must increase **without a reload**. If it does not:
`docker compose logs realtime` in `/opt/zuu/supabase`, confirm the publication
(`select * from pg_publication_tables where pubname='supabase_realtime'` shows `public.notifications`), and confirm in
the browser devtools that the WebSocket connected (status 101). The class feed posts in `class-detail-client.tsx` also create notifications for other members.

**BYL webhook (12).** This verifies signature checking and routing without touching any data: a correctly signed
event with an empty `client_reference_id` is accepted (HTTP 200) but decoded as “no user”, so nothing is written.

```bash
SECRET=$(grep '^BYL_WEBHOOK_SECRET=' /opt/zuu/app/deploy/.env | cut -d= -f2-)
BODY='{"type":"checkout.completed","data":{"id":"test","client_reference_id":""}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')
curl -si -X POST https://next.zuutest.site/api/byl/webhook -H "Byl-Signature: $SIG" -d "$BODY" | head -1                 # HTTP/2 200
curl -si -X POST https://next.zuutest.site/api/byl/webhook -H "Byl-Signature: bad" -d "$BODY" | head -1                  # HTTP/2 401
```

For a real end-to-end payment test, use BYL's test mode against the **production** URL after cutover with a throwaway user, and
check `payments` / `access` rows. The webhook URL registered in BYL (`https://zuutest.site/api/byl/webhook`) does **not** change,
because the domain doesn't.

---

## 8. Cutover

Prerequisites: §7 checklist fully ticked on a rehearsal; TTL on `zuutest.site`/`www` has been low for at least one old TTL; a low-traffic
window with no exam running; you have the Vercel dashboard and the DNS panel open and your rollback (§9) read.

1. **Freeze writes on HOSTED.** Announce the window. Best effort, optional: new connections to HOSTED become read-only with
   `alter database postgres set default_transaction_read_only = on;` (revert later with `... reset default_transaction_read_only;`),
   but long-lived pooled connections keep working until they reconnect, so the real guarantee is “no one is using the site”.
   Note the time (`date -u`): `T_CUTOVER`.
2. **Fresh final import.** Re-run §3 (new dump directory), then wipe **only the VPS Supabase data** and reload:
   ```bash
   cd /opt/zuu/supabase && pwd        # must print /opt/zuu/supabase
   docker compose down
   sudo rm -rf /opt/zuu/supabase/volumes/db/data
   sudo find /opt/zuu/supabase/volumes/storage -mindepth 1 -not -name .gitkeep -delete
   docker compose up -d && docker compose ps      # wait until db/auth/storage are healthy (~1 min)
   ```
   Then §4 (restore, checks), §5.1 (`cs`), §5.2 (`rw 0`, `rw 1`, `rw 0`), §6. Row counts must be identical.
3. **Quick test on `next.zuutest.site`**: log in as yourself, open an old image, submit nothing.
4. **Move DNS.** Change the **A** record of `zuutest.site` and `www` to the VPS IP (and remove/replace any **AAAA** that points at Vercel).
   Check from outside: `dig +short A zuutest.site @1.1.1.1`.
5. **Enable the production vhost** right after DNS resolves (Let's Encrypt needs it to): uncomment the production block in the
   Caddyfile / nginx file, then
   `sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy` (or `sudo nginx -t && sudo systemctl reload nginx && sudo certbot --nginx -d zuutest.site -d www.zuutest.site`).
   Certificate issuance takes seconds to a minute; until then browsers that already have the new IP show a TLS warning. That is the one visible blip.
6. **Verify production**: `curl -sI https://zuutest.site/api/health`; repeat checklist items 1, 5, 6, 8 on `https://zuutest.site`.
   Confirm the BYL dashboard still shows the webhook URL `https://zuutest.site/api/byl/webhook`.
7. **Watch for an hour**: `docker logs -f zuu-app`, `docker compose -f /opt/zuu/supabase/docker-compose.yml logs -f --tail=50 auth rest realtime storage`,
   `docker stats --no-stream`, and muur.site itself (`curl -sI https://muur.site`) so you notice any cross-impact.
8. Set up backups now (§11) and **take the first one by hand**.

Afterwards: remove `next.zuutest.site` from the proxy and DNS, and raise the DNS TTL back to something normal (e.g. 3600 s).

## 9. Rollback plan

HOSTED Supabase and the Vercel project are untouched by everything above, so rolling back is a DNS change.
**Keep both for at least 2 weeks after cutover** (don't pause, delete or let a free-tier project be auto-paused: check its plan).

*Roll back if*: auth or exam submission is failing and not fixed within ~15 minutes, data looks wrong, or the VPS is unstable/affecting muur.site.

1. **DNS**: point `zuutest.site` and `www` back at Vercel (the previous records; write them down before changing them). With the low TTL
   this takes effect in minutes. Vercel's env vars still point at HOSTED, so no Vercel change is needed.
2. Users are signed out again (cookie name reverts) and use the same passwords, as long as they have not changed them since cutover.
3. **Reconcile what was written on the VPS during the outage window** (this is the part that costs time, so keep the window short).
   Anything created since `T_CUTOVER` exists only on the VPS: new sign-ups, exam attempts/answers, payments, class posts, notifications, uploads.
   For each table with such rows, export from the VPS and insert into HOSTED, newest-rows-only. Payments and access first, since those are money:
   ```bash
   # on the VPS; column name created_at is an assumption, check each table
   docker exec supabase-db psql -U postgres -d postgres -c "\copy (select * from public.payments where created_at >= '<T_CUTOVER as timestamptz>') to stdout with csv header" > payments.new.csv
   # then \copy into a staging table on HOSTED and `insert ... on conflict do nothing`
   ```
   New `auth.users` rows need the user inserted into HOSTED via the Admin API (`auth.admin.createUser` with the password reset flow) rather than SQL.
   For a window of minutes with the site closed to users, it is usually simplest to ask the handful of affected users to repeat the action.
4. Check **BYL**: payments that completed while the webhook target was wrong may need a replay from BYL's dashboard.
5. Tell users; write down what failed; fix on the VPS; repeat from §8 step 1.

Rolling back **only the app** (Supabase on the VPS is fine, the new image is bad): `deploy.sh` already does this automatically when the container does not become healthy;
manually: `APP_TAG=previous docker compose --env-file deploy/.env -f deploy/docker-compose.app.yml up -d app`.

---

## 10. Redeploy flow

### 10.1 Manual (always available)

```bash
ssh <deploy-user>@<vps>
cd /opt/zuu/app && ./deploy/scripts/deploy.sh
```

`deploy.sh` pulls (or builds), starts the new container, waits for the Docker healthcheck, and **rolls back to the previous image** if it never becomes healthy.
It only touches the `zuu-app` project.

### 10.2 GitHub Actions (builds off the VPS)

`.github/workflows/deploy.yml` builds the image on GitHub (cached), pushes it to GHCR, then SSHes in and runs `deploy.sh` with that tag.
It is `workflow_dispatch` only until you enable the `push` trigger at the top of the file.

One-time setup:

```bash
# laptop: a dedicated key just for deploys
ssh-keygen -t ed25519 -N '' -C zuu-deploy -f ./zuu_deploy
# VPS: a user that can run docker (docker group == root-equivalent: use a dedicated user, key-only)
sudo adduser --disabled-password zuudeploy && sudo usermod -aG docker zuudeploy
sudo install -d -m 700 -o zuudeploy /home/zuudeploy/.ssh && sudo tee -a /home/zuudeploy/.ssh/authorized_keys < zuu_deploy.pub
sudo chown -R zuudeploy: /opt/zuu/app          # it runs git pull there
# VPS, as zuudeploy: read access to the private GHCR image (a fine-grained/classic PAT with read:packages)
docker login ghcr.io -u <github-user>           # paste the token at the prompt
# laptop: host key to pin (compare the fingerprint with the one shown in the Contabo console)
ssh-keyscan -t ed25519 <vps-ip> > known_hosts.txt
```

In GitHub → Settings → Secrets and variables → Actions:

- **Secrets:** `DEPLOY_HOST` (IP), `DEPLOY_USER` (`zuudeploy`), `DEPLOY_SSH_KEY` (contents of `zuu_deploy`), `DEPLOY_KNOWN_HOSTS` (contents of `known_hosts.txt`).
- **Variables:** `NEXT_PUBLIC_SUPABASE_URL` (`https://supabase.zuutest.site`), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon key; public by design),
  `NEXT_PUBLIC_APP_URL` (`https://zuutest.site`), and optionally `DEPLOY_APP_DIR`.
- Create an Environment named `production` (optionally with required reviewers) and delete the local key files.

Set `APP_IMAGE=ghcr.io/<owner>/<repo>` (lowercase) in `/opt/zuu/app/deploy/.env`. Run the workflow manually once, verify, then uncomment `push: branches: [main]`.
Server-only secrets are never in GitHub or in the image; they live in `deploy/.env` on the VPS.

---

## 11. Backups

Nightly logical backups + a storage archive, kept 14 days locally and copied **offsite** (a backup on the same disk is not a backup).

```bash
sudo crontab -e
# 03:17 every night (UTC); set the offsite target for your provider
17 3 * * *  RCLONE_REMOTE=zuu-crypt:backups HEALTHCHECK_URL=https://hc-ping.com/<uuid> /opt/zuu/app/deploy/scripts/backup.sh >> /var/log/zuu-backup.log 2>&1
```

- Offsite: `rclone config` creates a remote (S3/B2/Backblaze/Google Drive…) and a **`crypt`** remote on top of it, because the archive contains
  password hashes and personal data and the stack's `.env` (JWT secret, DB password). `RSYNC_DEST=user@host:/path` is the alternative.
  The script warns loudly if neither is set.
- Optional monitoring: a free healthchecks.io check; the script pings it on success and `/fail` on error.
- Files written per run: `public.sql.gz`, `auth-data.sql.gz`, `storage-data.sql.gz`, `storage-policies.sql`, `storage.tar.gz`, `full.dump`, `env.supabase`, `SHA256SUMS`.

**Restore** (disaster recovery) is the §4 procedure using the nightly files: bring up a fresh stack (`setup.sh`, then copy the backed-up `env.supabase`
over `.env` so the JWT secret, keys and DB password match what the app and the dumps expect), then, in order:
`auth-data.sql.gz` → `public.sql.gz` → `post-restore.sql` → `storage-policies.sql`, and for files: stop `storage`,
`tar --xattrs -xzf storage.tar.gz -C /opt/zuu/supabase/volumes`, load `storage-data.sql.gz` (preceded by `set session_replication_role = replica;`, like §4.1), start `storage`.
(`full.dump` is the fallback if the logical files are somehow unusable; it is a plain `pg_restore` target, but restoring a whole Supabase database over a fresh one
needs care with the pre-existing system schemas, so prefer the logical path.)
**Do a restore drill once on a laptop** (Docker Desktop, `setup.sh` with a different `SB_DIR`) within the first month: an untested backup is a hope, not a backup.
You cannot drill on the VPS itself without stopping the live stack, because container names are fixed.

---

## 12. After it is stable

- Remove the `next.zuutest.site` block/record; raise DNS TTLs.
- After ~2 weeks without incident: export a final HOSTED dump, then pause (not delete) the HOSTED project and later the Vercel project.
- Revisit sizing with real numbers: `docker stats --no-stream`, `free -h`, `docker system df`, and `docker inspect supabase-db --format '{{.State.OOMKilled}}'`.
- Known follow-ups are listed in the PR description (not changed here because they alter app behaviour).

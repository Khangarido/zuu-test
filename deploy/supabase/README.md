# Self-hosted Supabase for zuutest.site

This is the **official `supabase/docker` stack, unmodified**, plus one small overlay
(`docker-compose.zuu.yml`) that trims it to what the app uses and keeps it away from
muur.site. Nothing here is a fork: `setup.sh` fetches upstream's `docker/` directory at a
pinned commit, and upstream's images, init SQL and Envoy gateway config are used as shipped.

> **Gateway note.** The upstream default gateway is now **Envoy** (it was Kong). It uses
> less memory and is what upstream tests against, so this setup uses it. Kong is still
> available upstream (`docker-compose.kong.yml`) if you prefer it, but is not needed here.

## What runs

| Service | Container | Needed because | Memory (est.) |
|---|---|---|---|
| Postgres 17 | `supabase-db` | all app data + `auth.*` + `storage.*` | 300–600 MB (hard cap 1.5 GB) |
| GoTrue | `supabase-auth` | email+password login, 6-digit email OTP, password reset | 30–80 MB (cap 256 MB) |
| PostgREST | `supabase-rest` | every `supabase.from(...)` call | 30–80 MB (cap 256 MB) |
| Realtime | `realtime-dev.supabase-realtime` | `postgres_changes` for the notification bell | 200–450 MB (cap 768 MB) |
| Storage API | `supabase-storage` | avatars, class/medee photos, question images | 100–250 MB (cap 384 MB) |
| Envoy gateway | `supabase-envoy` | one entry point routing `/auth/v1`, `/rest/v1`, `/realtime/v1`, `/storage/v1` | 40–100 MB (cap 256 MB) |
| nginx (static) | `supabase-mailtemplates` | serves the OTP / recovery email templates to GoTrue | ~5 MB |
| **Total, always on** | | | **≈ 0.8 – 1.6 GB** |
| Studio + pg-meta | `supabase-studio`, `supabase-meta` | optional dashboard; **off by default** | +0.5 – 0.9 GB while running |

Not started (the overlay moves them into the `unused` profile): **edge functions**
(no functions in this app), **Supavisor** (the app talks to PostgREST, not to Postgres;
this also keeps host ports 5432/6543 free), **imgproxy** (no image transforms are used),
**Logflare/Vector analytics** (an optional upstream overlay, not part of the default stack).

### Memory estimate for the whole deployment

These are **estimates from typical idle-to-light usage, not measurements from your server**.
After the rehearsal run `docker stats --no-stream` and replace them with real numbers.

| | Typical | Hard caps set in compose |
|---|---|---|
| Supabase core (table above) | 0.8 – 1.6 GB | ≈ 3.9 GB sum of caps (they never all peak together) |
| Next.js app | 0.15 – 0.4 GB | 768 MB |
| Studio + meta, only while in use | 0.5 – 0.9 GB | 1 GB |
| **Steady state, no Studio** | **≈ 1.0 – 2.0 GB** | |
| Building the app **on** the VPS | **~1.6 GB peak** (measured on a 4-core machine; `next build` is the one expensive step) | |

Guidance: plan for **≥ 3 GB of RAM that muur.site is not using** (2 GB in steady state plus
headroom), or add swap. **Build the image in GitHub Actions, not on the VPS** (see
`MIGRATION.md`, "Redeploy flow"). The per-container caps exist so a memory spike in this stack
gets OOM-killed inside its own cgroup instead of taking muur.site down; if Postgres is
being killed under real load (`docker inspect supabase-db --format '{{.State.OOMKilled}}'`),
raise `mem_limit` for `db` in the overlay.

Disk: images ≈ 3–4 GB (Studio is the biggest), plus your DB and uploaded files. Backups are
extra (see `scripts/backup.sh`).

## Install

On the VPS (needs Docker Engine, Compose ≥ 2.24, git, openssl):

```bash
cd /opt/zuu/app          # checkout of this repo
SB_DIR=/opt/zuu/supabase \
API_HOST=supabase.zuutest.site \
SITE_URL=https://zuutest.site \
API_GW_HTTP_PORT=8100 \
sh deploy/supabase/setup.sh
```

`setup.sh` is safe to run next to muur.site: it refuses to overwrite an existing install,
refuses if the chosen port is taken, never starts anything, never touches ports 80/443, and
does not print the secrets it generates (they are written to `/opt/zuu/supabase/.env`, mode 600).

Then:

1. Edit `/opt/zuu/supabase/.env`: set `SMTP_PASS` to the Resend API key (SMTP host/port/user
   are pre-filled for Resend). If the muur.site proxy runs in Docker, append
   `:docker-compose.edge.yml` to `COMPOSE_FILE`.
2. Start it:
   ```bash
   cd /opt/zuu/supabase
   docker compose pull
   docker compose up -d
   docker compose ps          # all "healthy" after ~1 minute
   ```
3. Smoke-test locally (the gateway answers on loopback only):
   ```bash
   ANON=$(grep '^ANON_KEY=' .env | cut -d= -f2-)
   curl -s -o /dev/null -w 'auth health  %{http_code}\n' http://127.0.0.1:8100/auth/v1/health -H "apikey: $ANON"
   curl -s -o /dev/null -w 'rest         %{http_code}\n' http://127.0.0.1:8100/rest/v1/       -H "apikey: $ANON"
   curl -s -o /dev/null -w 'storage      %{http_code}\n' http://127.0.0.1:8100/storage/v1/bucket -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
   ```
   Expect `200` from auth health and rest. Storage may return `400`/`401`/`403` for the
   anon key; anything that is not `502`/`503`/connection-refused means the route is alive.
4. Put the proxy in front (`../proxy/…`) and re-test over HTTPS.

The values the **app** needs (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
are `ANON_KEY` and `SERVICE_ROLE_KEY` in that `.env`. Copy them into `deploy/.env` on the server
yourself; they are never in git and never in this PR.

## Settings that must match the app

| Setting | Value | Why |
|---|---|---|
| `SUPABASE_PUBLIC_URL` / `API_EXTERNAL_URL` | `https://supabase.zuutest.site` / `…/auth/v1` | Email links and `JWT iss` use it; its first label names the auth cookie |
| `SITE_URL`, `ADDITIONAL_REDIRECT_URLS` | `https://zuutest.site`, plus `/**` globs for www and `next.` | Sign-up/reset links redirect to `window.location.origin/auth/callback`; GoTrue rejects any origin not listed |
| `ENABLE_EMAIL_AUTOCONFIRM=false` | | Users verify with the emailed 6-digit code (`verifyOtp({type:"email"})`) |
| `ENABLE_PHONE_SIGNUP=false`, `ENABLE_ANONYMOUS_USERS=false` | | Upstream defaults enable phone sign-up with auto-confirm; the app does not use phones |
| Email templates | `templates/confirmation.html` **contains `{{ .Token }}`** | The stock template only has a link, which would break sign-up. Replace the wording with your hosted templates (Dashboard → Authentication → Emails) but keep `{{ .Token }}` in the confirmation one |
| `GOTRUE_RATE_LIMIT_EMAIL_SENT=300` (overlay) | | GoTrue's default of 30 emails/hour would throttle a registration spike |
| SMTP | Resend: `smtp.resend.com:465`, user `resend`, password = API key | The app code never calls Resend; if hosted Supabase used Resend SMTP, reuse it. The sender domain must be verified in Resend |

## Operations

```bash
cd /opt/zuu/supabase
docker compose ps
docker compose logs -f --tail=100 auth        # or rest / realtime / storage / db / api-gw
docker compose restart auth                   # after editing .env
docker exec -it supabase-db psql -U postgres  # SQL shell (Postgres is NOT published on the network)
```

**Studio (optional, never public).** Start on demand, tunnel, stop:

```bash
docker compose --profile admin up -d studio meta
ssh -L 8100:127.0.0.1:8100 <you>@<vps>       # from your laptop
# open http://localhost:8100  → basic auth: DASHBOARD_USERNAME / DASHBOARD_PASSWORD from .env
docker compose --profile admin stop studio meta     # when done
```

The public host (`supabase.zuutest.site`) only forwards four path prefixes, so Studio is
unreachable from the internet even while it runs.

**Realtime tenant limits.** The seeded self-hosted tenant has a cap on concurrent
connections and events/second. For ~100 users it is fine; to check or raise it:
`docker exec supabase-db psql -U postgres -c "select external_id, max_concurrent_users, max_events_per_second from _realtime.tenants;"`.

## Upgrades

1. Read upstream `docker/CHANGELOG.md` and `docker/versions.md` for the new commit.
2. Take a backup (`../scripts/backup.sh`).
3. In a scratch directory run `setup.sh` with `SB_REF=<new commit>` and `SB_DIR=/tmp/sb-new`,
   diff `/tmp/sb-new/docker-compose.yml` against `/opt/zuu/supabase/docker-compose.yml`, and
   confirm the overlay still applies (`docker compose config` in the new directory must succeed).
4. Copy the new upstream `docker-compose.yml` and `volumes/` over the live ones (keep `.env`
   and `volumes/db/data`, `volumes/storage`), then `docker compose pull && docker compose up -d`.
5. Postgres major upgrades are a separate procedure (upstream `utils/upgrade-pg17.sh`); do not
   change the `db` image tag casually.

The pinned commit and the date it was validated are at the top of `setup.sh`.

## Moving data in

See `../MIGRATION.md`. Note the Postgres version: upstream defaults to **Postgres 17**, and
`pg_dump`/`pg_restore` can only restore into the same or a newer major version than the dump
came from. If the hosted project were on a newer major than the self-hosted image, stop and
ask before proceeding.

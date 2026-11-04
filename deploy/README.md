# Deploying zuutest.site to the Contabo VPS

Goal: move the Next.js app **and** Supabase (self-hosted, official Docker stack) onto
the VPS that already serves **muur.site**, without touching muur.site. The app code is
unchanged apart from the small fixes listed in the PR description.

```
                     80/443  (owned by the EXISTING proxy that serves muur.site)
                        │
        ┌───────────────┼──────────────────────────────────────┐
        │               │                                      │
   muur.site      zuutest.site, www…                  supabase.zuutest.site
 (untouched)      next.zuutest.site (rehearsal)       /auth/v1 /rest/v1 /realtime/v1 /storage/v1
                        │                                      │
              127.0.0.1:3100                          127.0.0.1:8100  (Envoy gateway)
              zuu-app (Next.js)                       ├─ auth (GoTrue)   ├─ rest (PostgREST)
                                                      ├─ realtime        ├─ storage
                                                      └─ db (Postgres 17)   (+ studio/meta on demand)
```

Everything we add listens on **127.0.0.1 only**; the existing proxy is the only public entry.

## Files

| Path | What it is |
|---|---|
| `Dockerfile`, `.dockerignore` | Multi-stage, non-root image (`output: "standalone"`) |
| `.env.example` | Variable names with placeholders. Copy to `deploy/.env` on the VPS |
| `deploy/docker-compose.app.yml` | The Next.js app, bound to `127.0.0.1:${APP_PORT:-3100}` |
| `deploy/docker-compose.app.edge.yml` | Only if the muur.site proxy runs in Docker |
| `deploy/proxy/Caddyfile.zuutest` | Extra site blocks for Caddy |
| `deploy/proxy/nginx-zuutest.conf` | Extra server blocks for nginx |
| `deploy/supabase/` | Trimmed self-hosted Supabase: `setup.sh`, overlay, email templates. See its README |
| `deploy/sql/` | Preflight, URL rewrite, storage-policy export, post-restore, count check |
| `deploy/scripts/` | `deploy.sh` (redeploy + rollback), `backup.sh` (nightly), `copy-storage.mjs` |
| `.github/workflows/deploy.yml` | Build image in CI, redeploy over SSH (manual trigger until you enable it) |
| `deploy/MIGRATION.md` | **The runbook. Follow it in order.** |

## Step 0: inspect what muur.site runs (do this before anything else)

Read-only commands. Paste the output somewhere you can refer back to; the answers decide
which proxy file you use and which ports are free.

```bash
# Who owns 80/443? (the proxy we must plug into)
sudo ss -tlnp | grep -E ':(80|443)\s'
# Everything listening, so we can pick free ports (defaults here: 3100 app, 8100 gateway)
sudo ss -tlnp
# Docker: running containers, their published ports and networks
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
docker network ls
# Host-level services (nginx / caddy / apache / traefik?)
systemctl list-units --type=service --state=running | grep -i -E 'nginx|caddy|apache|httpd|traefik|docker'
# Where is the proxy config?
ls /etc/caddy /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null
# Resources: you need headroom for ~2 GB RAM (see deploy/supabase/README.md)
free -h; nproc; df -h /; docker system df
# Docker / Compose versions (Compose >= 2.24 is required by the Supabase overlay)
docker --version; docker compose version
# Firewall state (we open nothing new; 80/443 are already open for muur.site)
sudo ufw status verbose 2>/dev/null || sudo iptables -S | head
```

Write down, because the PR asks for it:

1. Which process owns :80/:443: host **Caddy**, host **nginx**, or a **container** (Caddy, nginx, nginx-proxy-manager, Traefik)?
2. Are ports 3100 and 8100 free? If not, set `APP_PORT` / `API_GW_HTTP_PORT` and edit the proxy file to match.
3. Free RAM and disk, and whether there is swap.

## Which proxy file do I use?

| What owns 80/443 | Use | Upstream addresses |
|---|---|---|
| Host **Caddy** (systemd) | `proxy/Caddyfile.zuutest`, `import` it, `caddy validate`, `systemctl reload caddy` | `127.0.0.1:3100`, `127.0.0.1:8100` |
| Host **nginx** (systemd) | `proxy/nginx-zuutest.conf` as a **new** file, `nginx -t`, `systemctl reload nginx`, then `certbot --nginx` | `127.0.0.1:3100`, `127.0.0.1:8100` |
| **Docker** proxy (Caddy / nginx / NPM / Traefik) | Same snippet, but join the proxy to a shared network: add `deploy/docker-compose.app.edge.yml` and `deploy/supabase/docker-compose.edge.yml`, and use container names | `zuu-app:3000`, `supabase-envoy:8000` |
| Something else (Apache, Traefik labels, Cloudflare Tunnel…) | Mirror the rules in the Caddy file: two vhosts, WebSocket upgrade on `/realtime/v1/`, only four public paths on the API host, no response buffering, 55 MB body limit on the API host | same as above |

Rules every variant must keep (they are the point of the snippets):

- **WebSockets** pass through on `supabase.zuutest.site` (Supabase Realtime, the notification bell).
- **No response buffering** on the app (Next.js streaming; per the self-hosting guide,
  `X-Accel-Buffering: no` for nginx. The app also sends that header itself).
- The API host exposes **only** `/auth/v1`, `/rest/v1`, `/realtime/v1`, `/storage/v1`.
  Studio, pg-meta and functions are never public; reach Studio through an SSH tunnel.
- Pass `Host`, `X-Forwarded-Proto` and `X-Forwarded-Host`. The app builds redirect URLs
  from them (`src/lib/request-origin.ts`).
- Adding site blocks must not change global options or muur.site's blocks. **Always run
  the proxy's config test before reloading** (`caddy validate` / `nginx -t`).

## Ports and names at a glance

| Thing | Where | Default |
|---|---|---|
| Next.js app | host `127.0.0.1` | `3100` (`APP_PORT`) |
| Supabase gateway (Envoy) | host `127.0.0.1` | `8100` (`API_GW_HTTP_PORT`) |
| Postgres | **not published**; use `docker exec supabase-db psql …` | n/a |
| Studio / pg-meta | only with `--profile admin`, reached through the gateway over an SSH tunnel | n/a |
| Containers | `zuu-app`, `supabase-db`, `supabase-auth`, `supabase-rest`, `realtime-dev.supabase-realtime`, `supabase-storage`, `supabase-envoy`, `supabase-mailtemplates` | n/a |
| Compose projects | `zuu-app`, `supabase` (separate; muur.site's project is never touched) | n/a |
| Directories | `/opt/zuu/app` (repo checkout), `/opt/zuu/supabase` (stack + data) | n/a |

## Where NEXT_PUBLIC_* values come from

`NEXT_PUBLIC_*` are inlined at **build** time, so the image is built *for* one Supabase URL.
The API host (`https://supabase.zuutest.site`) is a brand-new subdomain, so it is final from
day one and the same image is used for rehearsal and production. Only the app host changes
(`next.zuutest.site` → `zuutest.site`), and nothing in the bundle depends on it
(`NEXT_PUBLIC_APP_URL` is only the BYL return URL; set it to the production URL from the start).

The auth cookie is named `sb-<first label of the API host>-auth-token`, so it becomes
`sb-supabase-auth-token` (it was `sb-<project-ref>-auth-token`). Consequence: **every user is
signed out once at cutover**; passwords, profiles and data are unaffected.

Next: [`MIGRATION.md`](./MIGRATION.md).

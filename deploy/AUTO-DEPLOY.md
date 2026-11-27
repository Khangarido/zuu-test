# Automatic deploys

After the one-time setup below, **merging a pull request into `main` updates zuutest.site by itself.**

```
 you / Claude change code on a branch  ─►  open a pull request
        │
        ▼
 CI (ci.yml): unit tests + production build        ← the PR cannot be merged if this fails
        │  merge into main
        ▼
 Deploy (deploy.yml), on GitHub:
   1. test      npm test
   2. build     Docker image → ghcr.io/<owner>/<repo>:<git sha>   (not built on your VPS)
   3. deploy    SSH to the VPS with a key that can ONLY run ci-deploy.sh
        │
        ▼
 On the VPS (deploy/scripts/ci-deploy.sh → deploy.sh):
   a. git: server copy = origin/main
   b. pull the new image
   c. migrate.sh: apply new SQL files from supabase/migrations/ (each once)   ← stops here if it fails
   d. start the new container, wait until Docker says "healthy"
   e. if it never becomes healthy: automatic rollback to the previous image
        │
        ▼
 GitHub checks https://zuutest.site/api/health and /login answer. Red run = something is wrong.
```

Open browser tabs: each build carries a deployment ID, so a tab opened before a deploy does a full
reload on its next click instead of silently failing against the new version.

## What you do for a normal change

1. Ask for the change (a branch is created, a pull request opens, CI runs).
2. Look at the preview if you want (`next.zuutest.site`, optional).
3. Click **Merge**. About 4 to 6 minutes later the site is updated.

**Database changes** go in a new file `supabase/migrations/YYYYMMDDHHMMSS_what_it_does.sql`
(additive, safe to re-run, no BEGIN/COMMIT inside; see `deploy/scripts/migrate.sh`). They are applied
automatically before the new code starts.

## One-time setup

### 0. Merge PR #1 into `main`
The server currently runs the code from the feature branch of PR #1. Merge it, so that `main` is what is live.

### 1. On the VPS: a deploy user, locked to one command
Run as root on the server. Replace nothing; copy the blocks as they are.

```bash
# a user that can run docker (docker group is root-equivalent, which is why its key is locked down below)
adduser --disabled-password --gecos "" zuudeploy
usermod -aG docker zuudeploy
chown -R zuudeploy: /opt/zuu/app          # it updates the repo and reads deploy/.env
```

The server downloads the code from GitHub without a login, which works while the repository is public. If you
ever make it private, give the server read access first (a read-only deploy key, or a token in the remote URL).

Make the server copy follow `main` (one time, after step 0):

```bash
cd /opt/zuu/app && sudo -u zuudeploy git fetch origin && sudo -u zuudeploy git checkout main && sudo -u zuudeploy git reset --hard origin/main
```

### 2. A key for GitHub that can only deploy
On **your Mac** (not the server):

```bash
ssh-keygen -t ed25519 -N '' -C zuu-github-deploy -f ./zuu_deploy
cat zuu_deploy.pub
```

On the **server**, put that public key on one line into the deploy user's `authorized_keys`, in front of it
the forced command (this is the lock):

```bash
install -d -m 700 -o zuudeploy -g zuudeploy /home/zuudeploy/.ssh
cat > /home/zuudeploy/.ssh/authorized_keys <<'EOF'
command="/opt/zuu/app/deploy/scripts/ci-deploy.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding PASTE-THE-WHOLE-PUBLIC-KEY-LINE-HERE
EOF
chown zuudeploy: /home/zuudeploy/.ssh/authorized_keys && chmod 600 /home/zuudeploy/.ssh/authorized_keys
```

### 3. Let the server pull the private image
Create a GitHub token (**Settings → Developer settings → Personal access tokens → Tokens (classic)**,
scope **`read:packages`** only). On the server, as the deploy user (type the token at the prompt):

```bash
sudo -u zuudeploy docker login ghcr.io -u YOUR-GITHUB-USERNAME
```

### 4. GitHub settings
Repository → **Settings → Secrets and variables → Actions**

| Kind | Name | Value |
|---|---|---|
| Secret | `DEPLOY_HOST` | `194.233.94.216` |
| Secret | `DEPLOY_USER` | `zuudeploy` |
| Secret | `DEPLOY_SSH_KEY` | the full contents of the file `zuu_deploy` (private key) |
| Secret | `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 194.233.94.216` run on your Mac |
| Variable | `NEXT_PUBLIC_SUPABASE_URL` | `https://supabase.zuutest.site` |
| Variable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `ANON_KEY=` value in `/opt/zuu/supabase/.env` (public by design) |
| Variable | `NEXT_PUBLIC_APP_URL` | `https://zuutest.site` |

Then **Settings → Environments → New environment → `production`** (optionally tick *Required reviewers* if you want
a button to approve each deploy). Finally delete the key files from your Mac: `rm zuu_deploy zuu_deploy.pub`.

Also, branch protection: **Settings → Branches → Add rule** for `main`: require the **CI / check** status to pass
before merging.

### 5. First run
GitHub → **Actions → Deploy to VPS → Run workflow**. Watch the three steps turn green. Then open the site.

## If something goes wrong

- **A deploy fails its health check:** the server rolls back to the previous image by itself. The GitHub run is red.
- **A bad version got live anyway:** on GitHub, open the merged pull request and click **Revert**, then merge the revert.
  The pipeline redeploys the old code. Faster, on the server:
  `cd /opt/zuu/app && APP_TAG=previous docker compose --env-file deploy/.env -f deploy/docker-compose.app.yml -f deploy/docker-compose.app.edge.yml up -d app`
- **A migration failed:** the deploy stops before the new code starts; the old version keeps running. Fix the SQL file in a new pull request.
- **Stop auto-deploy:** GitHub → Actions → Deploy to VPS → "…" → **Disable workflow**.

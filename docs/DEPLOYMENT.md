# Deployment — Hostinger VPS (AlmaLinux)

Single-box Docker Compose deploy. Images are built by GitHub Actions and pulled
by the VPS; the server never compiles anything.

```
                 push to main
                      │
        ┌─────────────▼──────────────┐
        │ GitHub Actions             │
        │  ci.yml     (tests, tsc)   │
        │  deploy.yml (build → GHCR) │
        └─────────────┬──────────────┘
                      │ ssh
        ┌─────────────▼──────────────────────────────┐
        │ VPS  /opt/control-tower                    │
        │                                            │
        │  web (Caddy)  :80 :443  ◄── only exposed   │
        │    ├── serves built SPA                    │
        │    └── proxies /api /ws /health            │
        │           │                                │
        │      backend :8000 ──┬── db     (pgvector) │
        │      (gunicorn)      └── redis             │
        └────────────────────────────────────────────┘
```

Nothing but ports 80/443 is reachable from the internet. Postgres, Redis and
the API have no host port bindings at all.

---

## 1. One-time server setup

SSH in as root.

### 1.1 Base packages, swap, firewall

```bash
dnf -y update
dnf -y install dnf-plugins-core curl git policycoreutils-python-utils
```

Hostinger VPS images usually ship with **no swap**. The backend plus Postgres on
a 4 GB box will survive a traffic spike with swap and get OOM-killed without it:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
```

Firewall — only SSH and the web ports:

```bash
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=443/udp     # HTTP/3
firewall-cmd --reload
firewall-cmd --list-all
```

> If you previously ran the **dev** compose on this box, Postgres was published
> on `0.0.0.0:5434` with the hardcoded password `control_tower_dev_password`.
> Assume it was reachable and rotate that database, or drop and recreate it.

### 1.2 Docker

```bash
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker compose version    # must print v2.x
```

### 1.3 Deploy user

Deploys run over SSH; don't hand CI your root key.

```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /opt/control-tower && chown deploy:deploy /opt/control-tower

mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
# paste the PUBLIC half of the key pair you generate in step 2.2:
vi /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Harden SSH (`/etc/ssh/sshd_config`), then `systemctl restart sshd`:

```
PermitRootLogin no
PasswordAuthentication no
```

SELinux stays **enforcing** — the production stack uses named Docker volumes
only, so there are no bind-mount relabels to worry about.

### 1.4 Environment file

```bash
su - deploy && cd /opt/control-tower
# copy .env.prod.example from the repo, then:
cp .env.prod.example .env.prod
chmod 600 .env.prod
vi .env.prod
```

Generate the secrets:

```bash
openssl rand -hex 32                                  # APP_SECRET_KEY
openssl rand -base64 32 | tr -d '/+=' | head -c 40    # DB_PASSWORD
docker run --rm python:3.11-slim sh -c \
  "pip -q install cryptography && python -c \
  'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"   # TOKEN_ENCRYPTION_KEY
```

**Production refuses to boot unless all of these are right** (`app/core/config.py`):

| Variable | Requirement |
|---|---|
| `APP_SECRET_KEY` | ≥ 32 chars, not a known default |
| `APP_PASSWORD` | not `demo1234`/`changeme`/empty |
| `REDIS_URL` | set — injected by compose, don't remove it |
| `RESEND_API_KEY` | set — signup sends a verification email |
| `ALLOWED_ORIGIN` | must not contain `localhost` |
| `LLM_PROVIDER` | exactly `openai` or `anthropic` |
| `STRIPE_SECRET_KEY` | if set at all, must be `sk_live_…` |
| `VAULT_SYNC_ENABLED` | `false` (or `VAULT_SINGLE_TENANT_ACK=true`) |

---

## 2. Wire up automatic deploys

### 2.1 GHCR pull token

The VPS needs to pull private images. Create a classic PAT with **`read:packages`**
only: GitHub → Settings → Developer settings → Tokens (classic).

*(Alternative: make the two packages public under the repo's Package settings
and drop the token entirely.)*

### 2.2 SSH key for CI

On your laptop:

```bash
ssh-keygen -t ed25519 -C "github-actions-control-tower" -f ~/.ssh/ct_deploy -N ""
cat ~/.ssh/ct_deploy.pub     # → /home/deploy/.ssh/authorized_keys on the VPS
cat ~/.ssh/ct_deploy         # → the VPS_SSH_KEY secret below
```

### 2.3 Repository secrets

GitHub → repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `VPS_HOST` | the server IP |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | contents of `~/.ssh/ct_deploy` (the private key, including header/footer lines) |
| `VPS_SSH_PORT` | only if SSH isn't on 22 |
| `GHCR_PAT` | the `read:packages` token from 2.1 |

`GITHUB_TOKEN` is provided automatically and is what pushes the images.

### 2.4 First deploy

```bash
git push origin main
```

`deploy.yml` then: runs CI → builds both images → pushes to GHCR → copies
`docker-compose.prod.yml` + `deploy/deploy.sh` to the VPS → pulls and restarts.
`deploy.sh` polls `/health` for 120 s and **rolls back to the previous image
tags** if it never goes green, so a bad build doesn't leave the site down.

Every subsequent push to `main` repeats this with no manual step.

---

## 3. Operating it

```bash
cd /opt/control-tower
DC="docker compose -f docker-compose.prod.yml --env-file .env.prod"

$DC ps                         # what's running
$DC logs -f backend            # follow API logs (JSON-structured)
$DC logs -f web                # Caddy access logs
$DC restart backend            # after an .env.prod edit, prefer: $DC up -d backend
curl -s localhost/health       # {"status":"ok","db":true,...}
```

> `docker compose restart` does **not** re-read `env_file`. After editing
> `.env.prod` always use `$DC up -d <service>`.

**Migrations** run automatically — `entrypoint.sh` executes `alembic upgrade head`
before gunicorn binds, and `set -e` means a failed migration exits the container
instead of serving against a stale schema. Check with:

```bash
$DC exec backend alembic current
```

**Manual rollback** to a known-good build:

```bash
./deploy/deploy.sh ghcr.io/<owner>/control-tower-backend:<sha> ghcr.io/<owner>/control-tower-web:<sha>
```

**Backups** — install the nightly dump (see the header of `deploy/backup-db.sh`):

```bash
sudo cp deploy/backup-db.sh /usr/local/bin/ct-backup && sudo chmod +x /usr/local/bin/ct-backup
echo "30 2 * * * /usr/local/bin/ct-backup >> /var/log/ct-backup.log 2>&1" | sudo crontab -
```

Restore:

```bash
gzip -dc /var/backups/control-tower/control_tower-YYYYMMDD-HHMMSS.sql.gz \
  | $DC exec -T db psql -U control_tower -d control_tower
```

⚠️ **Never run `docker compose down -v`** — `-v` deletes the `pgdata` volume and
every row in it.

---

## 4. Moving to a domain + HTTPS

Right now the app runs over plain HTTP on a bare IP. That means the JWT auth
cookie travels in cleartext and cannot carry the `Secure` flag — anyone on a
shared network path can lift a session. Fix it as soon as you have a hostname.

Hostinger assigns every VPS a free `srvNNNNNN.hstgr.cloud` hostname (hPanel →
VPS → Overview). If that resolves to your IP it's enough for Let's Encrypt —
you don't have to buy a domain.

1. Point an `A` record at the VPS IP (or confirm the hstgr.cloud hostname resolves).
2. Edit `/opt/control-tower/.env.prod` — **both lines**:
   ```
   SITE_ADDRESS=app.example.com
   ALLOWED_ORIGIN=https://app.example.com
   ```
3. `$DC up -d`

Caddy provisions and renews the certificate on its own; certs persist in the
`caddydata` volume. `ALLOWED_ORIGIN` starting with `https://` simultaneously
switches the auth cookie to `Secure`, fixes the CSP `connect-src` for
`wss://`, and enables HSTS.

4. Add the new origin's redirect URIs to your Google Cloud OAuth client:
   `https://app.example.com/auth/google/callback` and
   `https://app.example.com/integrations/{gmail,gcal,gfit}/callback`.

---

## 5. Known constraints on this deployment

- **Public signup is open.** With billing off, `AI_FREE_MONTHLY_CREDITS`
  (default 200/user/month) is the only cap on LLM spend against your API key.
  This cap is enforced *only* when `ENVIRONMENT=production` — running the box in
  `development` mode gives every signup unlimited spend and re-enables the
  legacy env-credential login path. Keep it on `production`.
- **Vault sync is off** and must stay off: it reads one shared filesystem for
  all users and is not tenant-isolated.
- **Single box, no redundancy.** A deploy restarts the API; expect a few
  seconds of 502 while gunicorn boots and migrations apply.
- **`WEB_CONCURRENCY`** should stay ≤ 2 on a 2-vCPU plan. Each worker opens its
  own DB pool against Postgres' default `max_connections=100`. Only one worker
  runs the APScheduler jobs (Postgres advisory-lock leader election), so raising
  it won't duplicate agent runs.

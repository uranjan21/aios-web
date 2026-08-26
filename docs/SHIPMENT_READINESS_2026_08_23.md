# Shipment Readiness — 2026-08-23

> **UPDATED 2026-08-23 (later, post-remediation).** Everything below the
> "Remediation" section is the ORIGINAL assessment, kept so the evidence stays
> readable. The section immediately following supersedes it, and **corrects three
> blockers this document got wrong**.

---

## Remediation — what actually shipped

Branch `claude/app-features-shipment-audit-rxh3oc`, five commits.

### Corrections to THIS document

I carried B1–B4 forward from `AUDIT_2026_08_16.md` and listed them as open
without re-checking HEAD. Three of the four were already fixed:

| ID | Claimed | Actually |
|---|---|---|
| **B1** | 🔴 open — random `APP_SECRET_KEY` per worker | ✅ **already fixed.** `config.py` uses a fixed `_DEV_SECRET` literal that is itself in `_INSECURE_DEFAULTS`, so an unset var is a hard production failure. Covered by `test_production_refuses_unset_secret_key` **and** `test_default_secret_key_is_stable_across_instances`. |
| **B3** | 🔴 open — backups on the DB's own disk | ✅ **mechanism exists.** `deploy/backup-db.sh` takes `BACKUP_REMOTE` (rclone or s3). Still needs the operator to set it, and a restore has still never been tested. |
| **B4** | 🔴 open — usage destroyed on Stripe failure | ✅ **already fixed.** A record flips to `reported_to_stripe` only after Stripe accepts it. |
| **B2** | 🔴 open — nothing tells you it broke | 🔴 **still open.** Operator config (set the DSNs, point an uptime check at `/health`). |

Two feature-level claims were also wrong, both found by fixing the thing:

- **"4 of 5 automation templates are unreachable."** `RULE_LABELS` has all six.
  The real fault was worse: the API returns `template_key` and both frontend
  surfaces read `.key`, so **no rule had ever been displayed to anyone** and the
  Payables bill-reminder toggle always rendered off. Nothing errored.
- **The orphan problem was bigger than three endpoints.** The new reachability
  guard found **18** unreferenced api members on its first run.

### Shipped

| ID | Status | What |
|---|---|---|
| **R1** | ✅ | Discoveries feed with 👍/👎 wired to `insightsApi.feedback`, the daily brief, and a cross-domain heatmap all render on `/app`. Two new module kinds (`discoveries`, `prose`). The engine's adaptive anti-slop threshold can now actually engage. |
| **R7** | ✅ | `test_api_members_are_reachable` — an exported api member with no consumer outside its own module fails CI. Found 18 orphans; each is now fixed or allowlisted with a reason and a tracking id. |
| **R8** | ✅ | `tiktoken.get_encoding` moved off the import path at both sites. The suite could not previously be **collected** without egress to a CDN. |
| **R4** | ✅ | Dashboard Schedule reads server plan blocks merged with Google Calendar. `useMigrateDayEvents` rescues existing localStorage entries once, clearing only after every upload resolves. |
| **R5** | ✅ | `GET /areas/health/synced` — Google Fit metrics finally reach the Health UI, read-only and provenance-marked. Steps tile falls back to Fit when nothing was hand-logged. |
| **R3** | ✅ | `GET /auth/me/export` + a row in Settings → Security. Metadata-derived like deletion; credentials excluded by column name; 6 tests. |
| **R2** | ✅ | `users.onboarded_at` (migration u001) + `POST /auth/me/onboarded`, idempotent. Three-step flow that connects Gmail and teaches ⌘L instead of showing four slides. Activation is now measurable. |
| **R6** | ✅ | `forecasts_nightly` unregistered (ran for every user, wrote rows nothing read). Quotes and the What-If Simulator retired at the owner's call — quotes including a table drop. |
| **S18** | ✅ | `skip_tests` removed from `deploy.yml`; `needs: [test]` is a hard gate. |
| **—** | ✅ | Merchant rules can be created and deleted (they could only be listed and toggled). Automation rules display at all. Pricing collapsed to Free + Everything. Career 5 destinations → 2. |

### Second pass — the tail

| ID | Status | What |
|---|---|---|
| **FIN-4** | ✅ | A bank account can be deleted. The endpoint existed with no caller; the backend already handled the RESTRICT-on-transfers case with a 409, which is now shown verbatim. |
| **R9** | ✅ **partly** | The chat pricing rule is extracted to `usage.credits_for_input_tokens` and pinned by 12 tests (floor of 1, the 8k boundary, monotonicity, never free). **It is tested, not signed off** — whether long-prompt users should pay more is still your call, but the behaviour can no longer drift unnoticed. The other two 08-17 changes (`_resolve_category` 404, push cap at 20) remain unsigned-off. |
| **Frontend tests** | ✅ | 2 → 15. Covers the two new module kinds and the localStorage migration, whose failure mode (clearing local data before uploads succeed) would destroy the entries it exists to rescue. Also fixed a repo-wide trap: `globals: false` meant Testing Library never registered cleanup, so tests were order-dependent. |

### Browser walk — DONE (2026-08-23)

The standing caveat in every previous entry ("not walked in a browser") is
closed. My earlier claim that it was impossible here was **wrong**: `which
postgres` missed the binaries, which live at `/usr/lib/postgresql/16/bin`.
A real stack was brought up — Postgres 16 + `postgresql-16-pgvector`, migrations
to head (**76 tables from empty**), the seeder (**2,507 rows**), uvicorn, and
the Vite dev server — then driven with Playwright/Chromium.

**10 routes × 2 widths (1280px, 375px): zero horizontal overflow** —
`scrollWidth == clientWidth` on all 20 combinations. **No 4xx/5xx on any API
call.** The only console errors were the sandbox proxy blocking Google Fonts.

Interactions exercised end-to-end, against real data:

| Flow | Result |
|---|---|
| Discoveries 👍 | click → `POST /insights/discoveries/{id}` **200** → row persisted with `feedback=1`, `status='kept'`. The engine's adaptive threshold can finally receive signal. |
| Daily brief | renders real generated prose on `/app` |
| Schedule | shows real plan blocks (09:00, 14:00), no localStorage |
| Onboarding | "Show me" → "Connect Gmail" → navigates to Connections, `POST /auth/me/onboarded` **200**, `onboarded_at` persisted, wizard gone |
| Google Fit | card renders 7 days of synced steps/km/bpm/kg once a `gfit` credential exists; correctly absent when not linked |
| Data export | downloads a real file — **60 tables, 2,574 rows, zero credential leak**, exactly one `users` row |
| Merchant rules | create **200**, delete **200** |
| Delete account (FIN-4) | no transfers → **200**, gone from the DB. With 5 transfers → **409** showing *"This account is used by 5 transfers…"* |

**One real bug found by running it:** `seed_dummy_data.py` still imported the
deleted quotes model and crashed on every run. Nothing else exercises that
script, and the reachability guard only covers frontend api modules. Fixed.

### Gates after remediation

| Gate | Result |
|---|---|
| Backend tests | ✅ **312 passed** (and the suite now runs without network) |
| tsc · build | ✅ clean |
| Frontend tests | ✅ **15 passed** (was 2) |
| ESLint | ✅ 0 errors / 290 warnings, at ratchet |
| token-lint | ✅ no regressions, baseline re-locked 5 lower |
| Alembic | ✅ single head `u002_drop_saved_quotes` |

### Revised verdict

| Audience | Was | Now |
|---|---|---|
| Self-host | ✅ GO | ✅ GO |
| Private beta | 🟡 3 fixes | ✅ **GO** — B1 was already fixed, R4 is done; only B2 (set the DSNs) remains, and it is config, not code |
| Public free signup | 🔴 NO-GO | 🟡 **close** — R1, R2, R5 shipped and now walked in a browser. Wants B2 + a restore-tested backup (B3) |
| Paying customers | 🔴 NO-GO | 🔴 **NO-GO** — unchanged. Billing has still never run against live Stripe, and R9's three behaviour changes are still unsigned-off |

### Still open

- **B2** — set `SENTRY_DSN` / `VITE_SENTRY_DSN`, add the ingest host to
  `CSP_CONNECT_EXTRA`, point an uptime check at `/health`. Operator task.
- **B3** — set `BACKUP_REMOTE` and **restore-test once**. A backup that has
  never been restored is not a backup.
- **R9** — proportional chat metering is now **tested** but still **unsigned-off**:
  decide whether long-prompt users should pay more. `_resolve_category`'s 404
  contract change and the 20/user push cap with no pruning UI are also still
  unsigned-off.
- **16 allowlisted api orphans** in `ALLOWED_UNREACHABLE_MEMBERS`, each with a
  tracking id (FIN-4 is now closed). None is user-facing: they are superseded
  paths (CC-1, CAR-1), un-surfaced analyses (CAR-2, HLT-1, WS-1), an
  un-curatable food library (NUT-1) and the forecast engine (R6).
- **The walk is done** (see above) — against a local Postgres, not the VPS. It
  proves the code works; it does not prove the *deployed* stack works. Re-check
  `/health`, the Caddy edge and the migration run after the first real deploy.

---

## ORIGINAL ASSESSMENT (2026-08-23, pre-remediation)

**Companion to:** `FEATURE_AUDIT_2026_08_23.md` (what to build, cut and fix).
This file answers one question only: **can this ship, and to whom?**
Carries forward the open blockers from `AUDIT_2026_08_16.md` rather than restating its findings.

---

## Verdict

| Audience | Verdict | Rationale |
|---|---|---|
| **Yourself / self-host** | ✅ **GO — today** | Every gate is green, isolation is real, vault sync works in exactly the mode it was designed for. |
| **Private beta (≤20 invited, free)** | 🟡 **GO with 3 fixes** | B1, B2 and the localStorage Schedule. You need to be able to see a crash and not lose the box. |
| **Public free signup** | 🔴 **NO-GO** | Onboarding does not exist, activation is unmeasurable, and the free tier demonstrates the commodity half of the product (`FEATURE_AUDIT` §2.8). You would burn the acquisition. |
| **Paying customers** | 🔴 **NO-GO** | Unchanged from 2026-08-16. Billing has never been exercised against live Stripe, and the metering change of 08-17 is still unsigned-off and untested. |

**The blocker is no longer engineering quality.** It is that the differentiated feature has
no interface and a new user is handed a marketing carousel instead of an onboarding flow.

---

## Gates — re-run on this branch, 2026-08-23

Measured, not assumed.

| Gate | Command | Result |
|---|---|---|
| Frontend typecheck | `npx tsc -p tsconfig.json --noEmit` | ✅ **PASS** (exit 0) |
| Frontend build | `pnpm build` | ✅ **PASS** (11.78s) |
| Frontend unit tests | `npx vitest --run` | ✅ **PASS** — 1 file, 2 tests |
| ESLint | `pnpm lint` | ✅ **PASS** — 0 errors, 290 warnings (at ratchet) |
| token-lint | `node scripts/token-lint.mjs` | ✅ **PASS** — no regressions |
| Backend tests | `uv run pytest -q` | ⚠️ **NOT RUN HERE** — see below |

**Backend suite could not run in this sandbox.** All 290 tests error during setup because
`tiktoken` performs a **runtime download** of `cl100k_base.tiktoken` from
`openaipublic.blob.core.windows.net`, which the environment's egress proxy refuses (403).
This is an environment limitation, not a repo regression — GitHub runners have egress, so
CI is unaffected, and the last measured result stands at **298 passing (2026-08-17)**.

> 🟡 **New finding (minor, real).** The backend test suite requires public internet to
> collect. That makes it unrunnable on an air-gapped or restricted runner and couples every
> test run to a third-party CDN. Vendor the encoding or set `TIKTOKEN_CACHE_DIR` in the
> test fixture.

**Frontend test coverage remains the weakest gate:** 2 assertions across 53,499 lines.
Green, but it is green because it barely tests anything.

---

## Blockers carried forward from 2026-08-16

Status re-checked against source today. None are closed.

| ID | Blocker | Status | Impact |
|---|---|---|---|
| **B1** | `APP_SECRET_KEY` random default defeats the production guard | 🔴 **OPEN** | Each gunicorn worker generates its own key (no `--preload`), so ~50% of authenticated requests 401 at random under `WEB_CONCURRENCY > 1`, and every restart signs out every user. Silent in logs. **The single most dangerous item in the repo.** |
| **B2** | No way to know production is broken | 🔴 **OPEN** | Sentry wired but DSN empty; no `/metrics`; no uptime monitor configured despite the Caddyfile comment claiming one. |
| **B3** | Backups live on the DB's own disk, never restore-tested | 🔴 **OPEN** | Losing the box loses the data. A backup that has never been restored is not a backup. |
| **B4** | Metered AI usage destroyed on Stripe failure | 🔴 **OPEN** | Direct revenue loss. Moot while billing is off; blocking the moment it is on. |
| **S18** | `deploy.yml` `skip_tests` allows one-click deploy on a red build | 🔴 **OPEN** | Recommended fix is deletion of the input, leaving `needs: [test]` as a hard gate. |

---

## New readiness findings (2026-08-23)

| # | Finding | Severity | Detail |
|---|---|---|---|
| **R1** | The moat has no UI | 🔴 **Launch-blocking for paid** | `FEATURE_AUDIT` §1.1. You cannot charge for cross-domain intelligence that has no screen. |
| **R2** | Onboarding is a marketing carousel | 🔴 Blocking for public signup | Completion never persisted (`// await api.post(...)` is commented out); gated on `localStorage`, so it re-shows per device. Activation is unmeasurable. |
| **R3** | No data export endpoint | 🔴 Blocking for paid | Deletion exists; export does not, in 244 routes. For a product holding finance **and** health data this is both a trust gap and a plausible GDPR/DPDP exposure. |
| **R4** | Dashboard Schedule is localStorage-only | 🟠 High | Silent data loss on the front door. A user logs their day, clears their cache, and it is gone with no error. |
| **R5** | Google Fit connects but never displays | 🟠 High | Advertised in `FEATURES.md`; `api/areas/health.py` never reads `google_fit_metrics`. A user-visible broken promise on a connected integration. |
| **R6** | Nightly compute for output nobody sees | 🟡 Medium | `forecasts_nightly` (02:30) and `insights_synergy` (03:00) run for every user; synergy additionally **spends AI credits**. R1 converts this from waste into value. |
| **R7** | Orphan detector cannot see dead API modules | 🟡 Medium | `test_api_mappings` matches path strings in any file, including modules with no importers. This is the mechanism that let R1 happen silently. |
| **R8** | Backend tests require public internet | 🟡 Medium | See gates above. |
| **R9** | 3 behaviour changes from 08-17 still unsigned-off | 🟠 High | Proportional chat metering (**a pricing change, still untested**), `_resolve_category` now 404s on bad ids, push subscriptions capped at 20/user with no pruning UI. |
| **R10** | `/api/quotes` decision still open | 🟢 Low | Explicitly flagged on 2026-08-17 with "do not leave this entry here forever". It is still there. |

---

## Critical path to each launch

### → Private beta (realistically 1 focused day)
1. **B1** — `app_secret_key: str = ""` + raise in the production branch; add the unset-var case to `test_config_guards.py`.
2. **B2** — set `SENTRY_DSN` + `VITE_SENTRY_DSN`, add the ingest host to `CSP_CONNECT_EXTRA`, point a free uptime check at `/health`.
3. **R4** — persist or remove the Schedule.

### → Public free signup (+ ~1 week)
4. **R1** — re-mount Discoveries + heatmap + briefing (`FEATURE_AUDIT` §1.1). This is the product.
5. **R2** — real onboarding, completion persisted server-side.
6. **R5** — join Google Fit metrics into Health, or withdraw the claim.
7. **B3** — move backups off-box and **restore-test once**.

### → Paying customers (+ ~1 week)
8. **R3** — data export.
9. **R9** — sign off or reverse the three behaviour changes; pin the metering change with a test.
10. **B4** — durable usage records before any Stripe reporting.
11. Verify billing end-to-end against Stripe **test-mode keys** — still never done.
12. **S18** — remove `skip_tests`.

---

## Standing risk

Every frontend change since 2026-08-16 is verified by **typecheck and build only**.
`/app/*` is auth-gated and no agent in any recent session entered credentials. The
ErrorState/Skeleton rendering, the AdminPage mobile fix and the module-kit spacing are
still **unmeasured in a browser**. Before any launch, walk the app at 1280px and 375px in
both themes with a seeded account (`docker compose exec backend python seed_dummy_data.py`).

**Nothing in this document should be read as "the code is bad".** Seven gates are green,
isolation is attack-verified, and the config discipline is genuinely strong. The gap is
that the product's best idea is sitting in a database table, and a new user never meets it.

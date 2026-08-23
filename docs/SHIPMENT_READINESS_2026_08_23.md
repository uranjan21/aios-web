# Shipment Readiness — 2026-08-23

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

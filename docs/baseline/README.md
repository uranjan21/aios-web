# Phase 0 baseline — 2026-07-21

Captured on branch `redesign/expressive` (forked from `monorepo`) before any
redesign work. Everything below is the "before" number that later phases are
measured against.

## Gates (all green at baseline)

| Gate | Result |
|---|---|
| `./node_modules/.bin/tsc -p tsconfig.json` | exit 0 |
| `pnpm build` | ✓ built in 9.02s |
| `pnpm test` (vitest) | 2 passed (1 file) |
| `cd backend && uv run pytest` | 204 passed |

Note: frontend test coverage is 2 tests in 1 file (`authStore.test.ts`). There is
effectively no component-level safety net, which is why the screenshot baseline
and `test_api_mappings.py` carry the verification weight in later phases.

## Bundle baseline (largest chunks, raw / gzip)

| Chunk | Raw | Gzip |
|---|---|---|
| `charts` | 724.48 kB | 222.87 kB |
| `index` | 552.18 kB | 153.90 kB |
| `vendor` | 250.00 kB | 79.82 kB |
| `ui` | 227.37 kB | 67.79 kB |
| **`Timeline`** | **225.93 kB** | **77.19 kB** |
| `CareerPage` | 130.44 kB | 44.32 kB |
| `QuickAddAccounts` | 84.00 kB | 23.46 kB |
| `HealthPage` | 61.58 kB | 15.42 kB |
| `FinancePage` | 53.14 kB | 15.21 kB |
| `DashboardPage` | 52.71 kB | 13.99 kB |

Two of these directly confirm audit findings and are the targets of Phase 1c:

- **`Timeline` at 225.93 kB** is the full `antd` package, bundled to render one
  `<Timeline>` component in three files — two of which are being deleted.
- **`charts` at 724.48 kB** is Recharts *and* Highcharts shipping together.
  Highcharts has exactly two consumers (`business/SummaryTab`, `CareerRadar`),
  both of which Phase 1 removes.

## Design-system drift baseline

`node scripts/token-lint.mjs` — **2,527 violations** across 10 rules:

| Rule | Count |
|---|---|
| `hardcoded-spacing` | 1006 |
| `inline-style-object` | 623 |
| `hardcoded-font-size` | 483 |
| `hardcoded-hex` | 126 |
| `adhoc-breakpoint` | 121 |
| `hardcoded-radius` | 112 |
| `rgba-in-shadow` | 7 |
| `hardcoded-font-family` | 7 |
| `pill-radius` | 6 |
| `undefined-css-var` | 36 |

The script runs in **ratchet mode** by default — it fails only when a count
rises above `scripts/token-lint.baseline.json`, so it can enforce from day one
without first fixing 2,527 sites. `--report` lists locations, `--update` re-locks
the baseline after a genuine reduction, and `--strict` (zero tolerance) becomes
the mode at the end of Phase 2.

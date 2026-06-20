# Scope: Card Standardization Milestone

## Architecture
- The frontend codebase uses `@ledgr/ui` for its design system.
- The global `Card` component is exported by `@ledgr/ui`. It supports the props: `title`, `subtitle`, `icon`, `action`, `variant`, `interactive`/`hoverable`, `size`, `noPadding`, `fadeIn`, `delay`.
- We need to standardize every primary card, KPI tile, and chart in all pages and tabs to use `Card` or `GlassCard`, supplying appropriate `icon`, `subtitle`, and positioning filters/segmented controls/chart legends in the `action` prop.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Exploration & Audit | Find all pages and tabs rendering cards or charts, identify missing icons, subtitles, and poorly-placed actions/filters. | none | DONE |
| 2a | General Pages Refactor | Update `LoginPage.tsx`, `DashboardPage.tsx`, `SettingsPage.tsx`, `AiInsightCard.tsx`, and `CareerRadar.tsx`. | M1 | PLANNED |
| 2b | Business & Career Refactor | Update `BusinessPage.tsx`, `SummaryTab.tsx` (business), and `CareerPage.tsx`. | M1 | PLANNED |
| 2c | Health, Finance & Content Refactor | Update `HistoryTab.tsx` (health), `FitnessTab.tsx` (health), `TransactionsTab.tsx` (finance), and `ContentPage.tsx` (content). | M1 | PLANNED |
| 3 | Verification & Review | Build the project, run tests, verify formatting, check via reviewers and challengers. | M2a, M2b, M2c | PLANNED |
| 4 | Forensic Audit | Pass the Forensic Integrity Audit checks with a CLEAN verdict. | M3 | PLANNED |

## Interface Contracts
- All cards must use `@ledgr/ui` `Card` or `GlassCard`.
- No custom styled-component card wrappers should be used.
- Every card must have `icon` and `subtitle` props.
- All filters, dropdowns, segmented controls, or chart legends must be passed via the `action` prop of the `Card`.

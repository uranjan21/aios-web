# AIOS Web — Design System & Architecture Audit

**Date:** 2026-07-11 · **Scope:** `frontend/src/` (187 files, ~40,003 LOC) + `ledgr-ui/src/` (92 files)
**Method:** 5 read-only audit passes (3 completed by parallel agents; 2 — token sweep + page-consistency matrix — hit the account session limit and were reconstructed via targeted grep). This is an audit, not a set of changes; **no code was modified.**

---

## 0. Executive summary

The app is **not** missing a design system — `@ledgr/ui` already ships ~40 components covering nearly the entire wishlist (Button, Card, Dialog, Sheet, DataTable, EmptyState, Skeleton, Spinner, PageHeader, Tabs, Select, SegmentedControl, KpiCard/StatCard, Toast, StatusBadge, …) with a complete token layer (color, spacing, radii, elevation, typography, z-index, motion, breakpoints).

The disease is **adoption, not absence**: feature code routinely bypasses the DS, and three classes of debt dominate:

| Problem class | Signal | Severity |
|---|---|---|
| **Duplicate DS components** | `components/ui/*` re-implements Card, Button, Table, Skeleton, AreaToolbar, EmptyState, Loader; `EmptyState` exists **3×** | 🔴 High |
| **DS bypass in features** | 74 `styled.button` / 40 files; only **1** file uses DS `Spinner` (6 custom spin loaders); 3 hand-rolled overlays instead of Dialog/Sheet; custom empty states in ~15 files | 🔴 High |
| **God-files** | 12 files > 600 LOC (GlobalAssistant 1562, SettingsPage 1469, AgentsPage 1319, AssistantChatInput 1123, TransactionsTab 1077…); business logic in JSX; `@ts-nocheck` on 2 financial/health components | 🔴 High |
| **Off-token CSS** | 476 hardcoded hex, 107 `border-radius:_px` literals, 29 z-index literals, 13 files with literal box-shadows | 🟡 Medium |
| **Rule violations** | 8 non-circular `9999px` pills; `StatCard` renders values in **serif** (conflicts with no-serif rule); `Tabs` exposes a `pills` variant | 🟡 Medium |
| **Good news** | 0 white-shadow violations; SegmentedControl well-adopted (21 files); PageDivider mostly correct; tokens are largely complete | 🟢 |

**Headline decision needed before refactor (see §7):** serif fonts. The no-serif hard rule bans Playfair/serif, but the current design deliberately uses `theme.typography.fontFamily.serif` (Playfair Display) in Sidebar, Login, Landing, and DS `StatCard`. These conflict; the user must pick.

---

## 1. Design-system state (`ledgr-ui/src`)

### Tokens — largely complete
Present: color (primitive ramps + semantic light/dark), spacing (4-pt: 0–24), radii (`none/sm6/md12/lg16/xl24/2xl30/full`), elevation (`none/xs/sm/md/lg/xl/ring` + clay trio), typography (family/size xs–4xl/weight/lineHeight/letterSpacing), z-index (named scale), motion (duration + easing), breakpoints (sm/md/lg/xl), border widths.

**Gaps:**
- No **icon-size** scale — sizes hardcoded inline everywhere (`size={14/16}`).
- No **opacity** scale — `0.5/0.6/0.7` and color-alpha suffixes (`+'15'`) hardcoded.
- `radii.xs` used in app `aiosTheme` but **absent from the ledgr-ui type** → `tsc` landmine.
- Semantic theme hex (`#1b6f5d`, `#f58220`) has **drifted from** the primitive palette (`teal.700 #114b3f`, `gold.500 #c8a449`) — the "swap RHS to rebrand" contract is partially broken. (Moot for the app, which overrides with the "Premium Black + Gold" `aiosTheme`.)

### Component coverage gaps
- **Button:** missing `success` variant; icon is a `size` not a variant; `startIcon/endIcon` (vs wishlist leftIcon/rightIcon).
- **Card:** no `loading` prop, no `footer` prop (CardFooter is sub-component only); `bordered`/`elevated` folded into `variant` rather than booleans.
- **DataTable:** **presentational only** — no sorting/pagination/row-selection/search/filters/toolbar built in. *This is why the big table components (TransactionsTab) hand-roll so much.*
- **Missing entirely:** exported `IconButton`, `Accordion`, `Pagination`, `Chip/Tag`, `Radio/RadioGroup`, `FormField/HelperText/ValidationMessage`, `ErrorState` (display, distinct from ErrorBoundary), `Timeline`, `ActivityItem`.

### Internal redundancy
- **`KpiCard` vs `StatCard`** overlap (same "label + big value + trend" job, different APIs, different base; `StatCard` uses serif value font, `KpiCard` sans). Consolidation candidate.
- `Tabs` `pills` variant name is a landmine vs the no-pills rule (radius is compliant, name isn't).
- `Card` `size="none"` vs `noPadding` — two ways to say the same thing.
- `Badge` vs `StatusBadge` — **correctly** layered (primitive vs domain-mapping wrapper); keep.

---

## 2. Duplicate components 🔴

Importer counts are real (grep of the import path). Canonical rule: **use `@ledgr/ui` directly; never wrap it** ([[feedback-use-ledgr-card-not-custom]]).

| File | What it is | DS equivalent | Real importers | Action |
|---|---|---|---|---|
| `components/ui/Card.tsx` | pure re-export of DS Card | **Card** | **0** | **Delete**, import from `@ledgr/ui` |
| `components/ui/button.tsx` | 1-line re-export shim | **Button** | 3 | Rewrite 3 imports → delete |
| `components/ui/skeleton.tsx` | pulse + Tailwind-class parser (shadcn) | **Skeleton** | 36 | Migrate 36 → DS Skeleton, delete |
| `components/ui/alert-dialog.tsx` | Radix shadcn wrapper | **ConfirmDialog** | 1 | Migrate `IntegrationsPage` → delete |
| `components/ui/Table.tsx` | `styled(Card)`+DataTable+footer | **DataTable**+**Card** | 4 | Fold into DS composition |
| `components/ui/AreaToolbar.tsx` | styled toolbar shell | **AreaToolbar** (DS!) | 1 | Migrate → delete |
| `components/ui/EmptyState.tsx` | styled empty state | **EmptyState** | 1 | Migrate → delete |
| `components/ui/Loader.tsx` | 337-line loader, off-palette hex | **Spinner** | 1 (router) | Migrate → delete |
| `components/EmptyState.tsx` | **2nd** empty-state impl | **EmptyState** | 9 | Migrate 9 → delete |
| `components/ErrorCard.tsx` | custom error surface | (no exact DS export) | 6 | **Add DS `ErrorState`**, migrate 6 |
| `components/ui/AreaTabs.tsx` | `styled(Tabs)` reskin | **Tabs** | 10 | Keep *only* if CLAUDE.md still mandates; else fold |
| `components/ui/Popconfirm.tsx` | antd-style API over ConfirmDialog | ConfirmDialog | 14 | Keep (thin adapter, widely used) |
| `components/ui/{ChartTooltip,DigitalCronInput,DocStyles}.tsx` | no DS equivalent | — | 2/1/7 | Keep (DigitalCronInput uses raw `<select>` → later) |
| `components/ui/progress.tsx` | Radix progress (shadcn) | none | 1 | **Add DS `Progress`** or keep isolated |

**`EmptyState` exists three times** (DS + `ui/EmptyState` + `components/EmptyState`) plus ~15 inline versions (§4). Consolidating to the DS one is the single highest-leverage cleanup.

---

## 3. DS bypass in feature code 🔴

- **Inline buttons:** 74 `styled.button` across 40 files + 5 raw `<button>`. Worst: GlobalAssistant (7), AssistantChatInput (5+2), SettingsPage (4), TopBar (4+2), LoginPage (3), FitnessTab (3), NotificationBell (3).
- **Custom spinners:** only **1** file uses DS `Spinner`; 6 hand-rolled 360° spin loaders (OAuthCallback, GoogleAuthCallback, DashboardPage, AgentsPage, IntegrationsPage, AssistantChatInput).
- **Hand-rolled overlays instead of Dialog/Sheet/Popover:** `AccountManager` (`createPortal` drawer → should be **Sheet**), `WelcomeWizard` (full-screen `motion.div`), `CommandPalette` (fixed backdrop), `CategoryPicker` (`createPortal` flyout → **Popover**), GlobalAssistant floating panels, IntegrationsPage (legacy Radix alert-dialog).
- **Inline card surfaces (16):** PricingPage (4: Panel/Summary/FreeBanner/CurrencyBadge), LandingPage (3), AdminPage (2: StatCard/SearchBar), CategoryPicker (2), plus ActionCenterStrip, GreetingHero, UpgradeWall, etc.
- **Inline empty states (~15 files):** content/OverviewTab (`EmptyNote` ×5), AnalyticsTab, CampaignsTab, PipelineTab, BodySleepTab (×3), NutritionTab, InboxTab, RelevantCards (×3), TodaysTimeline, NotificationBell, AgentsPage.
- **Inline tables:** only 1 raw `<table>` — `ImportCsvModal` (`PreviewTable`). Everything else routes through DataTable. 🟢
- **Error states:** custom `RouteErrorBoundary` (not DS ErrorBoundary), `ErrorCard` (6 users), + inline `isError ?` in AiInsightCard, OverviewInsightCard, RelevantCards, AgentsPage, IntegrationsPage.

---

## 4. Off-token CSS & rule violations 🟡

Verified counts (grep, `frontend/src`):

| Item | Count | Rule / target |
|---|---|---|
| Hardcoded 6-digit hex | 476 | → `theme.color.*` |
| `border-radius: _px` literals | 107 | → `theme.radii.sm/md` |
| z-index literals | 29 | → `theme.zIndex.*` |
| Files with literal box-shadow | 13 | → `theme.shadow.*` |
| **Non-circular `9999px` pills** | **8** | 🔴 no-pills rule ([[feedback-ui-radius-and-toggle-style]]) — incl. `StatusBadge` in AgentsPage |
| White/near-white shadows | **0** | 🟢 no-white-shadows rule respected |
| Serif font references | 24 | ⚠️ see §7 |

Specific off-palette offenders flagged by the God-file pass: AgentsPage terminal palette (`#dbe4f0/#8fd3ff/#0f172a/#ff5f56`), FitnessTab/NutritionTab (`#F8D168/#F4A261`, `rgba(45,49,58,…)`), AccountManager (`rgba(0,0,0,0.3)` overlay + ad-hoc shadow), `ui/Loader` (`#0F172A/#22C55E`).

---

## 5. God-files & architecture 🔴

Full per-file decomposition plans exist (see agent output / §8 appendix). Ranked:

| File | LOC | Split into | Effort | Regression risk |
|---|---:|---:|:--:|:--:|
| `finance/TransactionsTab.tsx` | 1077 | ~13 | L | **H** (`@ts-nocheck`, naive-datetime gotcha, shared TransactionModal) |
| `assistant/GlobalAssistant.tsx` | 1562 | ~14 | L | M (dead legacy send-path to prune) |
| `pages/AgentsPage.tsx` | 1319 | ~9 | L | M (`task_id` vs `id` identity bug) |
| `workspace/TasksPage.tsx` | 722 | ~8 | M | M (create-vs-edit null payload asymmetry) |
| `finance/AccountManager.tsx` | 644 | ~6 | M | M (custom drawer → Sheet migration) |
| `assistant/AssistantChatInput.tsx` | 1123 | ~9 | M | M (fake upload, stale `useCallback` deps) |
| `health/FitnessTab.tsx` | 893 | ~12 | M | M (`@ts-nocheck`) |
| `dashboard/RelevantCards.tsx` | 619 | ~8 | M | M (**mock sparkline data**, possibly-stale `/areas/*` routes) |
| `health/NutritionTab.tsx` | 672 | ~8 | M | L–M |
| `pages/SettingsPage.tsx` | 1469 | ~22 | M | **L** (already 18 self-contained islands) |
| `pages/LandingPage.tsx` | 818 | ~12 | M | L (pure presentational) |
| `dashboard/OverviewInsightCard.tsx` | 636 | ~6 | **S** | L (**~400 LOC dead brief-mode code to delete**) |

**Cross-cutting:** duplicated `monospaceFont` helper (GlobalAssistant + AssistantChatInput); global `window`-event bus (`open-new-*`) coupling tabs↔headers; mock data in `DomainPulseCard`; two `@ts-nocheck` financial/health files.

---

## 6. Page & pattern consistency 🟡

- **PageHeader:** 15/38 page files use it. Most non-users are legitimate (Login, OAuth callbacks, Landing, Pricing, legal, guide, area-settings sub-pages). Real gaps to reconcile against the standard: verify `SettingsPage`/`DashboardPage` header treatment, and **`BusinessPage` has a `PageDivider`** though it's an **area page** (standard says area pages get **no** divider) ([[feedback-page-header-standard]]).
- **SegmentedControl:** well-adopted (21 files); only 2 custom toggle candidates. 🟢
- **PageDivider:** correctly present on workspace/tool pages (Projects, Sprints, Tasks, Admin, Review, Integrations, Discoveries). BusinessPage is the one deviation.

*(This dimension is partially reconstructed — the full per-page matrix agent failed on the session limit; re-run after reset for the complete grid.)*

---

## 7. ⚠️ Decision required before refactor — serif fonts

`feedback-no-serif-fonts` (binding) says **never** use serif/Playfair/Fraunces. But the shipping design deliberately sets `theme.typography.fontFamily.serif = '"Playfair Display", serif'` and uses it in:
- `pages/LandingPage.tsx` (8×), `pages/LoginPage.tsx` (3×), `components/layout/Sidebar.tsx` (2×), and DS `StatCard` values.

These directly conflict. **I will not silently pick.** Options:
- **(A) Enforce no-serif** — rip Playfair out, everything sans (DM Sans), update the memory to record the newer decision superseded the old, use `tabular-nums` for numerals.
- **(B) Keep Playfair as a scoped display face** — headings/hero/numerals only — and formally narrow the no-serif rule to "no serif on body/UI text." Update the memory to reflect the exception.

---

## 8. Proposed phased refactor plan

Sequenced low-risk-first, each phase independently shippable and verifiable.

> **STATUS 2026-07-11:** ✅ **P1 COMPLETE** (tsc + `pnpm build` verified). Removed 6 duplicate `ui/*` implementations (Card, button, Loader→Spinner, ui/EmptyState, alert-dialog→ConfirmDialog, AreaToolbar); collapsed `components/EmptyState` (16 sites) → DS; deduped `ui/skeleton` to a DS-delegating adapter. Deferred within P1: `ErrorCard`→`ErrorState` (blocked on P0 — the DS component doesn't exist yet). Kept by design: `ui/Table`, `ui/Popconfirm`, `ui/AreaTabs` (composition/adapter/mandated, not duplicate implementations).

- **P0 — Foundations (low risk, high leverage):** add missing tokens (icon-size, opacity, `radii.xs`); add DS `ErrorState`, `IconButton`, and (decision) resolve serif. Prereq for clean downstream work.
- **P1 — Kill duplicates:** delete `ui/Card`, migrate `ui/skeleton`(36)→Skeleton, `components/EmptyState`(9)+`ui/EmptyState`(1)→DS EmptyState, `ui/Loader`+6 custom spinners→Spinner, `ui/AreaToolbar`/`ui/button`/`ui/alert-dialog`→DS, `ErrorCard`(6)→new ErrorState. Pure adoption, mechanical, high count.
- **P2 — DS bypass sweep:** inline `styled.button`→Button; inline card surfaces→Card; hand-rolled overlays→Dialog/Sheet/Popover (AccountManager, CategoryPicker, CommandPalette, WelcomeWizard); inline empty states→EmptyState.
- **P3 — Token retokenize:** 476 hex / 107 radius / 29 z-index / 13 shadow literals → tokens; fix 8 pill violations.
- **P4 — De-God, low-risk first:** OverviewInsightCard (delete dead code) → LandingPage → SettingsPage → then the medium-risk set. Extract hooks/services/selectors; components <250, pages <350.
- **P5 — High-risk de-God:** TransactionsTab, AccountManager drawer, AgentsPage (fix `task_id`/`id`), TasksPage (preserve null-payload asymmetry). Remove `@ts-nocheck`. Each behind full verification.

Binding constraints throughout: [[feedback-use-ledgr-card-not-custom]], [[feedback-page-header-standard]], [[feedback-ui-radius-and-toggle-style]], [[feedback-no-white-shadows]], [[feedback-dialog-icon-style]], and the serif decision from §7.

---

## Appendix — audit completeness
- ✅ Completed by agent: DS completeness, God-file decomposition (12 files, full plans), DS-bypass & duplication.
- ⚠️ Reconstructed by grep (agents failed on session limit, resets 5:50am Asia/Calcutta): token/CSS hardcode counts, page-consistency matrix. Re-run those two passes after reset for exhaustive file:line lists.

# Control Tower Redesign — Implementation Plan

**Source of truth for this plan:** the Claude Design canvas
`Control Tower Redesign.dc.html` in the claude.ai/design project
*Control Tower App Review* (`074f1974-cc60-4147-9f3c-ee89ed866380`), last synced
from the repo 2026-07-31. A local copy of the extracted HTML lives in this
session's scratchpad; re-pull with `DesignSync get_file` if it is gone.

**Plan written:** 2026-08-01. **Phases 1–3 are built, and all three net-new
features (Milestones, Career Journal, Week planner) are shipped end to end —
see the build log in §8b for what actually landed.**

---

## 0. What the design actually is

A single-file interactive prototype of the whole app: 34 destinations, a
two-level sidebar, light/dark, and a small layout DSL. Three layers matter:

1. **Chrome + tokens** — palette (`palette(mode)`), sidebar/header chrome
   (`chrome(mode)`), and a glass/gradient surface layer that does not exist in
   the app today. Palette hexes are *exactly* `mushroom-taupe` from
   `packages/shared/src/theme/palettes.ts`, so no new palette is needed.
2. **Navigation IA** — `navConfig()`: 5 groups → 9 areas → 34 sub-pages, as a
   collapsible tree in the sidebar with a per-domain colour indicator rail.
   This replaces today's flat 10-item sidebar + in-page `AreaTabs` walls.
3. **Page compositions** — 11 pages are hand-designed; the other 23 are
   declared as ordered module lists in `PAGES` and rendered by one generic
   12-column grid renderer. 18 module kinds: `tiles · progress · bars · donut ·
   heat · calendar · week · timeline · table · controls · queue · checklist ·
   notes · spans · rows · kanban · chat · agents`.

The design's own stated intent (from `github.md` in the project): *"the
two-level sidebar here is an intentional UX improvement over that flat nav"*,
and *"the module set answers the question the page name asks. No
KPI-row-everywhere."*

---

## 1. Decisions taken (2026-08-01, by Utsav)

| # | Question | Decision | Consequence |
|---|---|---|---|
| 1 | Type density: design's 11–14px vs. the app's 16px baseline | **Adopt the design's 13–14px scale** | Reverses the 2026-07-21 density decision app-wide. `packages/ui/src/theme/tokens.ts` `typography.role` + `fontSize` get re-scaled; `frontend/CLAUDE.md` density rule rewritten; token-lint `font-size` baseline re-locked. |
| 2 | 40× `border-radius:99px` in the design vs. the standing no-pill rule | **Allow pills for badges/chips only** | Rule narrowed, not retired: status chips + count badges may be `99px`; buttons, inputs, progress bars, cards stay `radii.sm/md`. Needs a new `radii.pill` token so it is still a token, not a magic number, plus a token-lint allowlist scoped to badge components. `feedback_ui_radius_and_toggle_style.md` updated. |
| 3 | Tabs the design omits | **Delete exactly what the design omits** | See §6. Two of them are *relocations*, not deletions (Rules → `finance:inbox`, Connections → `finance:accounts`). Google OAuth (Gmail/GCal/GFit) has no slot in the new IA and is planned into `settings:general`. |
| 4 | Three destinations with no backend | **Build all three now** | Workspace → Milestones (new model + migration + router), Career → Journal (new model + router), Today → Plan (week time-blocking planner: new model + router). See §5. |

### Standing rules this plan deliberately overrides

Both are user-confirmed above. Both must be written back to memory **before**
code lands, or the next session will "fix" the new design back to the old rule.

- `feedback_expressive_design_system.md` — density clause (16px baseline).
- `feedback_ui_radius_and_toggle_style.md` — no-pill clause.

### Standing rules this plan does **not** override

- **`feedback_no_white_shadows.md` stays binding.** The design's `glassHi`
  token is `inset 0 1px 0 rgba(255,255,255,0.85)` in **light** mode — a white
  inner highlight on light surfaces, which the rule bans. Port `glassHi` as
  dark-mode-only (the existing narrow exception); in light mode the same
  separation comes from `glassBorder`, which the design already carries. Not
  raised as a question because the design's light mode reads essentially
  unchanged without it.
- **No serif / no mono.** The design uses DM Sans throughout and the sync note
  records dropping Playfair — consistent with the app already.

---

## 2. Phase 1 — Token + chrome layer

Nothing else can be built faithfully until this lands. **`packages/ui` is the
authoritative token layer** — new tokens go there, not into `ctTheme.ts` (that
file's whole point since 2026-07-21 is that it only picks a palette + mode).

### 1.1 Re-scale typography — `packages/ui/src/theme/tokens.ts`

Map the design's observed sizes onto the existing role names so every call site
follows automatically:

| Role | Now | Design-derived | Where it shows up in the mock |
|---|---|---|---|
| `micro` | 11px | **10px** / 0.08em | section headers, eyebrow, "OWNER" |
| `label` | 13px | **11px** | meta lines, timestamps, tags |
| `body-s` | 13px | **12px** | card subtitle, muted body |
| `body-m` | 15px | **13px** | nav rows, table cells, body default |
| `body-l` | 16px | **14px** | card title, emphasised body |
| `title-s` | 17px | **15px** | brand wordmark, section titles |
| `title-m` | 20px | **18px** | — |
| `title-l` | 24px | **22px** | page greeting ("Good evening, Utsav") |
| `display-*` | unchanged | unchanged | hero numerals |

`fontSize.*` shifts one step down to match. Line-heights tighten proportionally
(the mock runs ~1.35–1.45 on body).

### 1.2 New surface tokens

The design carries a whole glass/gradient layer the app has no equivalent for.
Add as a `surface` group in `tokens.ts`, resolved per-mode in `buildTheme`:

- `glass.bg` / `glass.panel` / `glass.ctl` / `glass.ctlHover`
- `glass.border` / `glass.borderStrong`
- `glass.hi` *(dark mode only — see §1)*
- `glass.blur` (`saturate(180%) blur(22px)`), `card.blur` (`saturate(150%) blur(14px)`)
- `card.bg` — a 150° gradient, not a flat fill
- `card.shadow` — 3-part composite (hairline + long soft drop + inner hi)
- `chrome.*` — the sidebar/header set (bg gradient, border, fg, fgMuted, ctl,
  ctlHover, hi, edge, blur)
- `accent.grad` (135° gradient) and `accent.glowSm`
- `app.bg` — three stacked `radial-gradient`s + base colour

⚠️ `app.bg`'s radial gradients are the "decorative blurred blobs" the sync note
claims to have removed — they are still in the file. They are subtle
(0.10–0.20 alpha) and read as ambient tint, not blobs. Porting as-is; flag if
they read wrong on a real screen.

### 1.3 `radii.pill`

New token = `99px`. Allowed **only** in `Badge`, `StatusBadge`, `StatusPill`,
and the notification count. token-lint's `pill-radius` rule gets a
component-scoped allowlist rather than being deleted.

### 1.4 Verify

`pnpm --filter @ledgr/ui build` → `rm -rf apps/shell/node_modules/.vite` →
restart dev server → measure with `getBoundingClientRect()` in the browser.
(This is the documented ledgr-ui gotcha; skipping step 2 or 3 serves a stale
bundle while `tsc` stays green.)

---

## 3. Phase 2 — Navigation IA

The single largest structural change: **10 flat destinations + in-page tab
strips → 34 destinations in a two-level tree.**

### 2.1 `apps/shell/src/config/navigation.ts` — schema change

Still the single source of truth. `NavItem.subNav` already exists in the type
but is unused; the tree needs a real shape:

```
NavSection { label, key, items: NavItem[] }        // Home · Areas · Workspace · Intelligence · System
NavItem    { key, label, to, icon, color?, module?, adminOnly?, subs?: SubNavItem[] }
SubNavItem { key, label, icon, to }
```

Design's tree, verbatim:

| Group | Area | Sub-pages |
|---|---|---|
| Home | Today | Overview · Weekly review · Plan |
| Areas | Finance | Overview · Transactions · Budgets · Bills · Goals · Investments · Loans · Inbox · Accounts |
| Areas | Health | Overview · Workouts · Nutrition · Body metrics · Sleep · Habits |
| Areas | Career | Journal · Opportunities |
| Workspace | Workspace | Projects · Goals · Milestones · Sprints · Tasks |
| Intelligence | Chat · Agents | — |
| System | Settings | General · Appearance · Notifications · Billing · AI configuration · Security |
| System | Admin | — |

Domain colour comes from `ctTheme`'s `domainLight/domainDark` (already constant
across palettes — the design copied that behaviour deliberately). Non-domain
areas use the neutral `#78716C`.

### 2.2 Routing — `apps/shell/src/router.tsx`

Design addresses pages as `area:sub`. Two options; **take real paths**, not
query params — `?tab=` is what produced the tab walls the redesign is undoing,
and 34 destinations need to be linkable and breadcrumb-able.

- `/app` → Today overview; `/app/review`, `/app/plan` *(repurposed — see §5.3)*
- `/app/finance/{transactions,budgets,bills,goals,investments,loans,inbox,accounts}`
- `/app/health/{workouts,nutrition,body,sleep,habits}`
- `/app/career/{journal,opportunities}`
- `/app/workspace/{projects,goals,milestones,sprints,tasks}`
- `/app/settings/{appearance,notifications,billing,ai,security}`
- Redirects: every current `?tab=` URL → its new path; `/app/plan?view=goals`
  etc. → `/app/workspace/goals` (the 2026-07-21 collapse is being reversed by
  the design, so the old redirects invert).

`RequireModule` guards move onto the area's sub-routes.

### 2.3 Surfaces that read the nav

All five already read `navigation.ts` and must keep working: `Sidebar.tsx`
(the real work — add the sub-tree, indicator rail, per-section collapse
persisted in `uiStore.collapsedSections`, and collapsed-rail behaviour),
`TopBar.tsx` breadcrumbs (design shows Home icon → area → sub, 3 levels),
`BottomNav.tsx` (still 5 primaries — unchanged), `CommandPalette.tsx` (now
indexes 34 destinations, not 10), and `GOTO_SHORTCUTS`.

### 2.4 `AreaTabs` retires

`packages/shared/src/components/ui/AreaTabs.tsx` and every `tabs=` definition
in `FinancePage`, `HealthPage`, `CareerPage`, `PlanPage`, `SettingsPage` are
replaced by the sidebar tree. The area pages become thin route hosts.

---

## 4. Phase 3 — The module kit

**This is the highest-leverage phase.** 23 of 34 pages are pure compositions of
18 module kinds. Build the kit once as `packages/shared/src/components/modules/`
and each of those pages becomes a data file, not a layout file.

Renderer: 12-column CSS grid, `gap: 20px`, `max-width: 1240px`, each module
declares `span`. `tiles/kanban/chat/agents` render *bare* (no card shell);
everything else renders inside the standard card shell
(icon chip → title/subtitle → optional action button → hairline → body).

| Kind | What it renders | Reuse |
|---|---|---|
| `tiles` | auto-fit KPI tiles, optional dot/badge/mini-bar | `@ledgr/ui` `KpiCard`/`StatCard` — extend |
| `progress` | labelled rows + % bar + value | `lumina/ProgressBar` |
| `bars` | vertical bar chart w/ optional target line | Recharts |
| `donut` | conic donut + legend | Recharts `Pie` (`isAnimationActive={false}`) |
| `heat` | N-day × M-row intensity grid | `dashboard/LifeHeatmap` — generalise |
| `calendar` | month grid with per-day markers | `dashboard/MonthlyCalendar` — generalise |
| `week` | 7-column day planner with time blocks | **new** |
| `timeline` | vertical dotted timeline | **new** (Ant `Timeline` was removed 07-21) |
| `table` | configurable `gridCols`, cell tags/bold/align | `@ledgr/ui` `DataTable` — extend |
| `controls` | settings rows: toggle / select / value | `Switch` + `Select` |
| `queue` | triage rows: mono avatar, suggestion, 2 actions | **new** (close to `InboxTab`) |
| `checklist` | checkbox rows with meta | `Checkbox` |
| `notes` | textarea + submit | `Textarea` |
| `spans` | horizontal ranges on a fixed axis (sleep) | **new** |
| `rows` | generic list row: title/meta/tag/value | **new** (used on 9 pages) |
| `kanban` | column board | `@ledgr/ui` `KanbanBoard` |
| `chat` | thread + composer | `assistant/messages.tsx` |
| `agents` | agent cards w/ schedule + run state | `features/agents/*` |

Roughly 6 new, 8 extensions of existing components, 4 straight reuses.

---

## 5. Phase 4 — Page inventory

**Legend:** ✅ data exists · 🟡 partial (needs an aggregate endpoint) · 🔴 no backend.

### 4.1 Hand-designed pages (11)

| Page | Composition | Data |
|---|---|---|
| `today:overview` | greeting · 4 pulse tiles · Today's Focus (tasks + habits) · Schedule · 12-week activity heatmap | ✅ reuse `PulseRow`, `RelevantCards`, `UnifiedSchedulePanel`, `LifeHeatmap` |
| `finance:overview` | Net-worth hero (assets/liabilities split) · 3 KPIs · spend-by-category bars · recent transactions | 🟡 net-worth hero + assets/liabilities split is new aggregation |
| `finance:transactions` | filter dropdown + Add · 5-col table | ✅ `TransactionsTab` |
| `finance:budgets` | month summary line · per-category bars w/ spent/limit | ✅ `BudgetsTab` |
| `health:overview` | 4 KPIs · week workout-minute bars · daily habits w/ streaks | ✅ |
| `workspace:projects` | filter + New · 5-col table (status dot, timeline, priority, completion) | ✅ `ProjectsPage` |
| `workspace:goals` | filter + New · goal/domain/target/progress/status table | ✅ `GoalsPage` |
| `workspace:milestones` | grouped-by-period list, domain chip, due, status | 🔴 **new entity** |
| `workspace:sprints` | filter + New · sprint table | ✅ `SprintsPage` |
| `workspace:tasks` | collapsible per-project groups, 4-col rows | ✅ `TasksPage` |
| `settings:general` | left section rail + profile field rows w/ Edit/Locked | ✅ `AreaSettingsPage` + `ProfileSection` |

### 4.2 Modular pages (23)

| Page | Modules | Data |
|---|---|---|
| `today:review` | progress(7) · checklist(5) · notes(7) · timeline(5) | ✅ `ReviewPage` |
| `today:plan` | week(12) · progress(6) · rows(6) | 🔴 **new** — week planner |
| `finance:bills` | calendar(7) · rows(5) · controls(12) | ✅ `finance_payables` |
| `finance:goals` | tiles · bars(7) · timeline(5) | ✅ |
| `finance:investments` | tiles · donut(5) · bars(7) · table(12) | ✅ |
| `finance:loans` | tiles · progress(12) · table(7) · donut(5) | 🟡 principal-vs-interest split |
| `finance:inbox` | queue(12) · controls(6) · rows(6) | ✅ `InboxTab` + `finance_rules` |
| `finance:accounts` | tiles · table(7) · progress(5) | 🟡 sync-health + credit-utilization |
| `health:workouts` | bars(7) · checklist(5) · table(12) | ✅ |
| `health:nutrition` | donut(4) · progress(8) · timeline(6) · bars(6) | ✅ |
| `health:body` | tiles · bars(8) · progress(4) · table(12) | ✅ |
| `health:sleep` | tiles · spans(12) · donut(5) · rows(7) | 🟡 stage mix + correlations |
| `health:habits` | heat(12) · checklist(5) · progress(7) | ✅ |
| `career:journal` | notes(12) · timeline(7) · rows(5) | 🔴 **new entity** |
| `career:opportunities` | kanban(12) · table(12) | ✅ |
| `chat:overview` | chat(12) | ✅ `ChatPage` |
| `agents:overview` | tiles · agents(12) · table(12) | ✅ |
| `settings:appearance` | controls(12) · rows(6) · controls(6) | ✅ |
| `settings:notifications` | controls ×3 | ✅ |
| `settings:billing` | tiles · progress(5) · table(7) · controls(12) | ✅ |
| `settings:ai` | tiles · controls(7) · notes(5) · table(12) | 🟡 per-area data-access matrix |
| `settings:security` | tiles · table(7) · controls(5) · rows(12) | 🟡 active-sessions list |
| `admin:overview` | tiles · bars(7) · progress(5) · table(12) | 🟡 throughput + job runs |

---

## 6. Phase 5 — Backend work

### 5.1 Milestones (new)
`WorkspaceMilestone`: `user_id`, `title`, `goal_id` FK, `domain`, `due_date`,
`status`, `position`. Alembic migration on top of current head. CRUD router in
`api/workspace.py`. Must be multi-tenant from line one (`user_id` FK + every
query scoped) and added to `tests/test_isolation.py` and conftest's table list.

### 5.2 Career journal (new)
`CareerJournalEntry`: `user_id`, `body`, `entry_date`, `tags`, `word_count`.
The design's "Themes this month · auto-tagged from your entries" implies an
LLM tagging step — **meter it** (`record_ai_usage` + `ai_allowed`) like every
other LLM site, or make it keyword-derived and non-LLM. Recommend non-LLM v1.

### 5.3 Week planner (new) — and a naming collision
The design's `today:plan` is a *time-blocking* planner (12 focus blocks across
4 domains, planned-hours-vs-capacity, one priority per day). The app's current
`/app/plan` is the goals/projects/sprints/tasks page — which the design moves
under Workspace. So `/app/plan` changes meaning. New `PlanBlock` model:
`user_id`, `date`, `start`, `end`, `domain`, `title`, `goal_id?`.

### 5.4 Aggregate endpoints for the 🟡 rows
Eight pages need a server-side aggregate rather than client math: net-worth
hero, loan principal-vs-interest, account sync health + credit utilization,
sleep stage mix + correlations, AI data-access matrix, active sessions, admin
throughput + job runs. Each is a read-only `GET`; batch them into one PR per
area.

---

## 7. Phase 6 — Deletions

Per decision #3. Backend routes stay; only UI is removed.

| Removed from UI | Note |
|---|---|
| Finance → Analytics tab | `AnalyticsTab.tsx`; no slot in the new IA |
| Finance → Rules tab | **relocated** into `finance:inbox` `controls` module |
| Health → Water tab | `WaterTrackerWidget`; `/health/water/today` route stays |
| Health → History tab | `HistoryTab.tsx` |
| Settings → Connections | **partly relocated**: institution links → `finance:accounts`; Google OAuth (Gmail/GCal/GFit) → `settings:general` |
| Settings → Knowledge, Automations, Briefing, Shortcuts, System status, AI usage | AI usage gauge is absorbed by `settings:billing`'s "Usage this cycle" progress module; the rest have no slot |

⚠️ Do **not** delete `ConnectionsSection`'s OAuth *flow* code — the Gmail link
is what the Transaction Tracker agent and `finance:inbox` depend on. Only its
Settings-section placement goes away.

---

## 8. Sequencing

```
P1 tokens ──► P2 nav IA ──► P3 module kit ──┬─► P4 Finance pages
                                            ├─► P4 Health pages
                                            ├─► P4 Workspace pages   ◄── P5.1 milestones
                                            ├─► P4 Today/Career      ◄── P5.2/5.3
                                            └─► P4 Settings/Admin/Intelligence
                                                        │
P5.4 aggregates (parallel, per area) ───────────────────┘
                                                        ▼
                                                   P6 deletions ──► P7 verify
```

P1 and P2 are strictly serial and block everything. P3 unblocks five parallel
tracks. Deletions go **last** so nothing is removed before its replacement
renders.

---

## 8b. Build log

### Phase 1 — tokens ✅ 2026-08-01

- `typography.role` re-scaled (body-m 13/19, body-l 14, body-s 12, label 11,
  micro 10, title-l 22); `fontSize` shifted one step; `radii.md` 14 → 16px;
  `radii.pill` added.
- New on `Theme`: `surface`, `chrome` (mode-following), `accent`,
  `appBackground`; `glass` extended with filter/borderStrong/hi/ctl/ctlHover/
  shell/panel/shadow. All derived from the palette through `alpha()`/`mix()`
  helpers in `theme.ts` — verified against the canvas's hardcoded taupe hexes
  and matching to within a few RGB units, while staying palette-generic.
- `glass.hi`/`chrome.hi` are `'none'` in light mode. `feedback-no-white-shadows`
  was NOT overridden.
- `ctTheme.ts` lost its always-dark `chrome` triple (zero call sites);
  `AppShell`'s two hand-rolled radials became `theme.appBackground`.
- Verified: tsc + `pnpm build` + vitest green; body measured live at
  **13px/19px DM Sans**; every new token group printed from the built bundle in
  both modes.

### Phase 2 — navigation IA ✅ 2026-08-01

- `navigation.ts` rewritten as the tree: `NAV_SECTIONS` (5 groups → 9 areas →
  34 destinations), plus `DESTINATIONS` (flat leaf list for ⌘K) and
  `resolvePath()` (longest-prefix match).
- **`Sidebar` was never mounted.** `AppShell` rendered only TopBar + BottomNav;
  the app's whole navigation was six hardcoded links in the TopBar. That is why
  `theme.chrome` had zero consumers. Sidebar is now mounted and is the primary
  nav; TopBar shows breadcrumbs instead.
- Sidebar renders sections where an area WITH subs becomes its own section
  (header = area name, rows = subs) and areas without subs pool per group —
  one indent level, not a nested accordion. Active row is domain-coloured with
  a 3px indicator on the rail.
- Routing: `:section` segment on finance/health/career/settings, new
  `/app/workspace/:section`. `?tab=`/`?view=` and the old top-level paths
  redirect via the new `useAreaSection` hook.
- Settings collapsed 14 sections → the design's 6, mostly by absorption
  (Connections into General, Briefing+Automations into Notifications, AI
  usage into Billing, Knowledge into AI). Only Shortcuts and System status
  were genuinely dropped.
- Milestones and Career Journal render honest stubs pending Phase 5.
- Verified: tsc + build + vitest green; walked Finance→Investments,
  Workspace→Milestones, Settings→Billing in both light and dark; measured
  **exactly one** active sidebar row out of 33 rendered links.

**Known deviation:** `/app/plan` still renders the old planning page and is
reachable a second way via `/app/workspace/*`. Phase 5 replaces it with the
week planner.

### Phase 3 — module kit ✅ 2026-08-01

- `packages/shared/src/components/modules/` — all 18 kinds, the 12-column
  `ModuleGrid`, shared `primitives`, and `useModulePalette` (resolves a spec's
  semantic `colorKey` against the live theme, so pages stay palette-agnostic
  instead of inheriting the canvas's taupe hexes).
- **All 23 modular pages ported verbatim** into `modules/pages.ts` (76 modules)
  by extracting and transforming the canvas's `PAGES` literal — icon strings
  mapped to lucide components. Every module typechecks against the hand-written
  `ModuleSpec` union, which is the real proof the port is faithful.
- New derived token `theme.color.borderHover` (base border pulled 12% toward
  the foreground) — the canvas used it in six places and no palette declared it.
- Two deviations from the canvas, both deliberate: the agents run-log panel
  uses the UI face with tabular figures rather than a monospace stack
  (`feedback-no-serif-fonts`), and meter tracks use `radii.sm` rather than
  `99px` — on a 5–7px-tall bar the browser clamps radius to half the height, so
  those render identically while honouring the no-pill rule. Text chips DO use
  the new `radii.pill`.
- **Where the pages live:** 21 of the 23 modular destinations already have
  working live-data pages, and the canvas's module lists carry the designer's
  *sample* data. Mounting them at the real routes now would swap real numbers
  for mock ones, so the layouts render at **`/app/design`** (a gallery with a
  section picker, deliberately not in the nav tree) until Phase 4 rebuilds each
  page's modules from its API response. The two destinations with NO live
  implementation — `career:journal`, and `today:plan` pending Phase 5 — are the
  exceptions; Journal ships its canvas layout at its real route now.
- Verified: tsc + build + vitest green; walked `finance:accounts` (tiles /
  table / progress), `health:sleep` (tiles / spans / donut / rows) and
  `today:plan` (week / progress / rows) against the canvas.

### Phase 4/5 — first vertical slice: Milestones ✅ 2026-08-01

Milestones was taken end to end — backend to a live-data module page — because
it was the one destination with no existing implementation to regress, which
makes it the pattern for the rest of Phase 4.

- **Backend:** `Milestone` model (`workspace_milestones`), migration
  `w005_workspace_milestones` (new head, applied), CRUD on
  `/api/workspace/milestones`. `goal_id` is ON DELETE **SET NULL**, not
  CASCADE — deleting a goal should orphan its dated commitments, not silently
  delete them. Ownership, goal↔domain consistency and status validation reuse
  the existing `_get_owned` / `_check_goal_domain` / `_reject_nulls` helpers.
- **Tests:** 5 new isolation tests (list excludes, PATCH 404, DELETE 404,
  unknown status 422, cannot attach to another user's goal). Backend suite
  **236 passing**. `test_api_mappings` caught the frontend gap before the UI
  existed — the guard works.
- **Frontend:** `MilestonesSection` builds `tiles` + one `timeline` per period
  bucket from live API rows. No layout code — a data transform plus
  `ModuleGrid`. Overdue / Next 30 days / This quarter / Later / No date, with
  undated milestones kept visible rather than sorted into a misleading bucket.
- Verified live: created 5 milestones through the API, page renders computed
  KPIs, correct bucketing, status chips in the right semantic colours, and
  soonest-first ordering with overdue on top.

**The Phase 4 pattern, for the remaining pages:** keep the canvas's module
COMPOSITION, replace its sample rows with a `useMemo` that maps the API
response into module specs. The page keeps its own interactive surfaces
(dialogs, mutations) around the grid.

### Phase 5.2 — Career Journal ✅ 2026-08-01

Second vertical slice, and it removes the last placeholder data from a real
route — `career:journal` had been shipping the canvas's sample rows.

- **Backend:** `CareerJournalEntry` model + migration `c002_career_journal`
  (new head, applied), CRUD + `GET /journal/stats` on
  `/api/areas/career/journal`. Stats returns this month's volume, the
  consecutive-day writing streak (yesterday still counts — today may just not
  be written yet) and theme frequency.
- **Themes are keyword-derived, not LLM-tagged.** Every other LLM call site in
  this codebase is metered against the AI quota, and a tagging pass on every
  save is not worth a credit. `_THEME_KEYWORDS` in `api/areas/career.py`.
- **`notes` gained an optional controlled mode** (`values` / `onValueChange` /
  `onSubmit` / `submitting` / `hideDraft`). Without them it renders inert
  exactly as the canvas drew it, which is what the design gallery needs; a real
  page opts in and the composer writes.
- **Tests:** 6 new isolation/behaviour tests including tag derivation and
  per-user stats. Backend suite **242 passing**.
- Verified live: 5 entries written, streak and word counts computed, composer
  disabled when empty → enabled on input → saves → clears, tags derived
  server-side, theme counts recomputed.

### Phase 5.3 — Week planner ✅ 2026-08-01

Third slice, and the last of the three net-new features. `/app/plan` now means
what the redesign says it means.

- **Backend:** `PlanBlock` model + migration `w006_plan_blocks` (new head,
  applied), CRUD on `/api/workspace/plan-blocks`. Times are local wall-clock
  `time` values, NOT timestamps — a block is "Tuesday 09:00–10:30 in the user's
  day" and storing it as an instant would make it drift when they travel.
  `end_time > start_time` enforced; **at most one priority per day**, enforced
  server-side (promoting a block demotes the incumbent).
- **`/app/plan` changed meaning.** It is the week planner; the
  goals/projects/sprints/tasks page it used to be is under `/app/workspace/*`.
  `PlanRoute` in router.tsx forwards old `?view=` links, which a static
  `<Navigate>` cannot read.
- **One deliberate departure from the canvas:** it labels the progress module
  "Planned hours vs capacity". There is no capacity model, and inventing a
  denominator would put a fake number on screen, so the module shows planned
  hours per domain as a share of the week's planned time. Same question,
  answered with data that exists.
- **Tests:** 4 new (isolation, cross-tenant PATCH, end-before-start 422,
  priority exclusivity). Backend suite **246 passing**.
- Verified live: 10 blocks across 6 days render in the week grid with today's
  column ruled in the accent, domain colours correct, 13.0h totalled and split
  by domain, and the per-day priority list populated.

### Bug found and fixed in this session's own code

`toISOString().slice(0,10)` in the new planner converted local midnight to UTC,
so east of UTC every date shifted back a day — the seeded week landed on Sunday
26 July instead of Monday 27th. This is the **documented** finance-date trap,
reintroduced. Fixed with a shared `packages/shared/src/lib/calendarDate.ts`
(`toCalendarDate` / `fromCalendarDate` / `daysUntil`) and applied to all three
new pages. `fromCalendarDate` also fixes the mirror-image bug: `new
Date('2026-08-09')` parses as UTC midnight and renders as the 8th west of UTC.

**Any new date-only field must use these helpers.**

**Migration chain now:** `f001_finance_email_ingestion` →
`w005_workspace_milestones` → `c002_career_journal` → `w006_plan_blocks`
(head).

**Note for Phase 6:** `ModuleSidebar` and `ModuleLayout` now have no consumers
outside `AgentsPage`; `AnalyticsTab`, `RulesTab`, `HistoryTab`,
`ShortcutsSection` and `SystemStatusSection` are unreferenced.

### Phases 4 + 6 — every remaining page ✅ 2026-08-02

All 34 destinations now render their canvas composition from live data, and the
code the conversions orphaned is gone. Branch `redesign/phase4-loans`.

**Order it went in:** Finance (loans first as the pattern, then bills, goals,
investments, inbox, accounts) → Health (5 new section components; HealthPage is
now a thin route host) → Career opportunities, Weekly review, Agents → Settings
×5 + Admin → the §4.1 hand-designed pages.

**The rule that decided every judgement call:** where the canvas draws a control
for something the backend does not store, the module becomes read-only `rows`
rather than a switch that writes nowhere; where it draws an analysis the data
cannot support, the module keeps the question and answers it from what exists.
Each such departure is documented in the file it affects. The full list:

| Page | Canvas asks for | Rendered instead |
|---|---|---|
| finance:loans | interest paid to date, principal-vs-interest of past payments | interest *ahead* and principal outstanding — no payment history exists |
| finance:goals | per-goal monthly contributions | monthly savings from snapshots vs the rate the deadlines demand |
| finance:investments | XIRR, monthly SIP, portfolio value over time | absolute return, holding count, gain/loss per holding |
| finance:inbox | "filed automatically today" | ledger rows carrying the tracker's origin tag |
| finance:accounts | Last sync / Status, credit utilization | balance and share-of-assets |
| health:body | muscle / fat / hydration from a smart scale | body fat, BMI, distance to goal weight |
| health:sleep | bedtime→wake `spans`, stage-mix donut | hours-per-night bars, last night vs target; correlations grouped by the quality word |
| career:opportunities | dated next actions | every lead by time-in-stage |
| today:review | generated cross-domain chores | the user's open goals, where ticking has a real effect |
| agents | 14-run sparkline, cross-agent run log | the one run an agent row stores |
| settings:appearance | density segment, font-size slider | dropped — type scale is a design-system decision |
| settings:notifications | quiet-hours window | the briefing delivery window |
| settings:billing | invoices | owned modules + the Stripe portal |
| settings:ai | custom instructions, per-area access matrix | knowledge source, entitlement |
| settings:security | 2FA, active sessions | the auth facts that are recorded |
| admin | requests/hour, CPU, job runs | signups per month, plan mix, recent signups |

**Five pages were deliberately NOT rewritten**, because they already satisfy
their canvas composition and a conversion would only subtract:

- `today:overview` — Dashboard already composes greeting · PulseRow · Today's
  Focus · Schedule · heatmap. §4.1 marked it "reuse", and it does.
- `settings:general`, `chat:overview` — likewise ✅ in §4.1.
- `workspace:tasks` — already renders collapsible **per-project groups**
  (`TaskGroup` keyed by project, plus "No Project"), which is exactly what the
  canvas draws. It additionally offers a grid/list toggle the canvas does not
  show; that is an extra affordance, not a missing one, so it stays.
- `finance:transactions` — already a filter + Add + columnar header list, i.e.
  the canvas's composition. Converting it to the `table` module would delete
  bulk select/categorize/tag/delete, inline row editing, keyboard navigation,
  sort and density persistence, CSV import and the Calendar/Weekly/Daily views
  — roughly 1,400 lines across `TransactionsTab` and `components/transactions/`
  — for no compositional gain. The `table` kind has no selection or inline-edit
  affordance, so this would be a strict downgrade. **If the plainer canvas list
  is wanted anyway, that is a product call, not a port.**

**Backend follow-ups this surfaced** (none blocking — the FE ships without
them): `credit_limit` on Account; `muscle_mass`/`hydration` log types; bedtime,
wake and sleep stages (available from Google Fit, already an integration); an
`agent_runs` table; a quiet-hours window; `custom_instructions` on the user;
per-area assistant scopes; a sessions table and TOTP; an instance-metrics
endpoint.

**Module kit gained optional handlers**, all inert when unused so `/app/design`
renders exactly as before: `onAction` on every module header; `onRowClick` on
`rows`/`progress`/`table`; `onTileClick`; `onToggle`/`onSelect`/`onSwatch` on
`controls`; `onPrimary`/`onSecondary` on `queue`; `onToggle` on `checklist`;
`onCardClick` on `kanban`; `onToggle`+`onCardClick` on `agents`. Rows carry an
optional `busy` flag so an in-flight mutation greys its own control.

**CRUD was preserved everywhere.** Where a card's action icons vanished with the
card, Delete moved into the dialog footer and a row click opens the editor.

**Deleted** (all unreferenced after the conversions): WealthTab, PlanningTab,
LedgerTab, AnalyticsTab, RulesTab, FitnessTab, NutritionTab, BodySleepTab,
HistoryTab, OpportunitiesTab, features/agents/*, ModuleLayout, ModuleSidebar,
ten Settings sections, DigitalCronInput, SideMenu, DocStyles, WaterTrackerWidget
and **SimulatorTab** — the What-If simulator, which the new Finance IA has no
slot for. Its backend route is untouched, so re-siting it is a UI decision.

**Regression caught by `test_api_mappings`:** deleting the Settings "System
status" section took the Web Push handshake with it, leaving the Notifications
push toggle setting a preference while nothing registered a service worker.
Rescued as `packages/shared/src/hooks/useWebPush.ts`.

**Mobile (risk #1, now addressed):** `tiles` became a scroll-snapped row below
`md` — the dashboard's PulseRow precedent — instead of a tall loose column;
`AutoGrid` collapses an explicit `cols` to one column; `controls` rows wrap;
the `table` min-width scales with column count. Walked at 375px with no
horizontal page overflow.

**Verified:** backend **246 passing** incl. the endpoint guard; tsc, `pnpm build`
and vitest clean. token-lint still fails against its stale baseline, but every
count fell: font-size 22→16, radius 10→9, hex 42→34, spacing 107→95,
rgba-in-shadow 33→27, inline-style 55→30.

## 9. Verification (every phase, not just the end)

- `./node_modules/.bin/tsc -p tsconfig.json` clean
- `pnpm build` clean
- `pnpm test` (vitest) green
- `node scripts/token-lint.mjs` — baseline re-locked once after P1 (density +
  pill changes will legitimately move counts), then must not rise
- `cd backend && uv run pytest` green, incl. new isolation tests for milestones
  / journal / plan blocks
- Browser walk per area: dev server, `read_console_messages` clean, screenshot
  of each redesigned page, both light and dark, plus one mobile viewport
  (`MOBILE STRICT` still applies — the design is desktop-only and says nothing
  about <1020px beyond hiding search and the user label)

## 10. Docs + memory to update when this lands

- `frontend/CLAUDE.md` — density rule, pill rule, nav rule (sidebar is no
  longer "top-level links only: no accordions"), AreaTabs rule retired
- root `CLAUDE.md` — a Recent Updates entry
- `PROGRESS.md` — mandatory per `AGENTS.md`
- memory: `feedback_expressive_design_system.md`, `feedback_ui_radius_and_toggle_style.md`

---

## 11. Open risks

1. **Mobile is unspecified.** The design defines two breakpoints, both of which
   only *hide* chrome. A 34-item tree, 12-column module grid and 5-column
   tables need a real mobile story, and `MOBILE STRICT` is a binding rule.
2. **Density reversal is app-wide.** Re-scaling `typography.role` changes every
   screen, including ones this redesign does not touch. Expect a visual-regression
   pass beyond the 34 pages.
3. **The mock's data is invented.** Every number is hardcoded. The 🟡 rows are
   where the design implies analysis the backend does not compute yet — those
   are the ones that will grow in scope.
4. **`/app/plan` changes meaning** mid-flight. Bookmarks and the `g p` shortcut
   both point at it.

### Canvas-alignment pass ✅ 2026-08-02 (later)

Utsav supplied five canvas screenshots — `today:overview`, `today:plan`,
`finance:overview`, `finance:transactions`, `finance:budgets` — and asked for
the pages to match them. Three of those five had drifted from the canvas during
Phase 4 and two were on the "deliberately not rewritten" list above; that list
is now **superseded for Dashboard and Transactions**, which Utsav ruled on
directly.

**Three decisions taken (asked, not assumed):**

1. **Transactions — restyle, keep every feature.** The canvas draws a plain
   5-column table; the page has ~1,400 lines of bulk ops, inline edit, keyboard
   nav, CSV import and Calendar/Weekly/Daily views. Utsav chose the shell and
   the column grid, not the subtraction. `TxnRowRoot` became a CSS grid on a
   shared `TXN_COLS` track (checkbox · DATE · MERCHANT · CATEGORY chip ·
   ACCOUNT · AMOUNT) with a matching `TxnHeaderRoot`; the action cluster
   overlays the amount column on hover so AMOUNT stays anchored right; the
   inline editor opts out of the grid entirely. Below `md` the grid is
   abandoned for two stacked lines — five columns on a phone is the
   horizontal-scroll pattern MOBILE STRICT bans. `AreaToolbar` moved INSIDE the
   card; Filter + "+ Add transaction" moved into the card header; the
   never-passed `navMenu` prop and its empty `WorkspaceLayout` rail are gone.
2. **Dashboard — match the canvas, drop the extras.** BriefingCard,
   OverviewInsightCard, DiscoveriesFeed and the 300px sticky calendar rail are
   no longer rendered. The files stay in the repo unreferenced: the data behind
   them (the daily brief, synergy discoveries) is still produced server-side.
3. **`PageHeader` — dropped app-wide**, not just on these pages. Zero call
   sites remain; `PageDivider` went with it.

**Kit additions — 18 kinds → 21.** `hero` (a lead figure with its
assets/liabilities split), `meters` (a grid of meter cards inside one shell —
the Budgets treatment, where `progress` is the same data as a flat list), and
`agenda` (time gutter · domain-coloured rule · entry, distinct from `timeline`,
which is a dotted thread of things that already happened). Plus: `rows` gained
`mono`/`monoKey`/`valueKey`, `progress` gained `valueKey` (so a bar and its
figure can differ), `checklist` gained `groupLabel`/`chips`/`onChipToggle` (the
dashboard's habit toggles), and `Base` gained `actionVariant`
(`primary`/`ghost`/`link`) plus `actionNode` — the one slot in the spec
language that takes elements, because the canvas puts real `Select`s in these
card headers.

**`formatAmount()`** added to `packages/shared/src/lib/utils.ts`. The canvas
prints full Indian-grouped currency (`₹18,42,650`) everywhere the number IS the
content, and only abbreviates on the dashboard's KPI tiles. `formatCurrency`
keeps the lakh abbreviation and is now for tiles; everything else uses
`formatAmount`.

**Where actions went.** `HeaderActionPortal` used to render inside a page's own
`PageHeader`. It is now consumed by **`PageContent`** (`@ct/shared`) through a
new `usePageHeaderActions()` hook: when — and only when — a page portals
something, `PageContent` renders a minimal eyebrow+title `PageHeader` at the
top of that page's content column, with the title taken from the nav tree via
`PageIdentityProvider` in `AppShell` (so no page hand-writes a section→label
map). A page with no page-scoped control renders no header, which is the
canvas's clean start. This is what kept
`/app/{finance,health,career}/settings` reachable — those routes are not in the
nav tree and the area page's Settings button was their only entry point.
Career's "Log entry", the workspace domain filter and `AreaSettingsPage`'s Back
go the same way. Card-scoped controls still belong in their card's header.

> **Correction (same day).** The first implementation pointed the portal at the
> global **TopBar**. Utsav reverted it: the TopBar is permanent app chrome —
> breadcrumbs, search, assistant, theme, notifications, account — and must not
> carry one page's controls. Only the consumer moved; every
> `HeaderActionPortal` call site is unchanged.

**Two departures from the canvas, both deliberate:**

| Page | Canvas asks for | Rendered instead |
|---|---|---|
| today:plan | "Planned hours vs capacity", e.g. "18h planned of 20h capacity" | planned hours per domain as a share of the week — there is no capacity model, and a fabricated denominator is a fake number on screen (this departure predates this pass and still stands) |
| today:overview | "Career streak · ↑ 3 vs last wk" | the streak, with the month's entry count beneath it — no historical streak is stored to compare against |

Everything else the tiles show is real: the net-worth delta comes from the most
recent prior-month `FinanceSnapshot` and says "No earlier snapshot to compare"
when there is none; month-over-month spend and savings-rate deltas are cut to
the **same day** of the previous month, because comparing month-to-date against
a full previous month reports a fall every month until the last day of it.

**One casualty, and it was retired (2026-08-02):** the Financial-health score
tile had no slot in the canvas's `finance:overview` (its three KPIs are Spend /
Savings rate / Upcoming bills), which left `financeApi.healthScore()` with no
caller. The product call was to retire it rather than re-site it — the two
candidate homes were both category errors (`finance:accounts` is account CRUD,
and three of the score's four components have nothing to do with accounts;
Finance settings is configuration, not read-only analysis), and the IA has no
analytics page left to put it on. Deleted: `GET /areas/finance/health-score`
and `_compute_health_score_for_date` (143 lines of `backend/app/api/areas/
finance.py`), `financeApi.healthScore`, and the `FinanceHealthScore` /
`HealthScoreComponent` types.

What went with it, should it ever be wanted back: a four-component composite
(savings rate, debt-to-income, emergency fund, budget adherence), each
component scored 0–100 with a human-readable `display` line and an `available`
flag so missing prerequisites were excluded from the average rather than
counted as zero, plus the same computation over the previous month under
`prev`. Every input still exists — the deletion is recoverable from git, not
from lost data.

**Verified.** tsc + `pnpm build` + vitest green. token-lint: every violation
count **exactly matches HEAD** (font-size 16, radius 9, hex 34, spacing 95,
rgba 27, inline-style 30) — zero drift added; it still fails overall on its
stale baseline, which a separate task owns. Rendered all seven new/changed
module shapes on a throwaway public route (login is unreachable to the agent)
at 1400px light, 1400px dark and 375px: no horizontal overflow at any width,
tiles scroll-snap and meters go single-column below `md`, then removed the
route. `test_api_mappings` currently fails on 10 unmapped backend routes — all
10 come from **uncommitted backend work in the same tree** (goal contributions,
investment transactions, loan payments, pending stats), not from this pass.

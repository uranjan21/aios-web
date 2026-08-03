> Scope: the **frontend only**. Project-wide context (stack, deploy topology,
> history, backlog) lives in the repo-root `CLAUDE.md`, which always loads too.
> Backend rules: `backend/CLAUDE.md`.

# Frontend — Control Tower

The frontend is a **pnpm-workspace monorepo** rooted at `frontend/` (moved here
from the repo root on 2026-07-28; it became a monorepo on 2026-07-20).

Each life domain is its own app package (`apps/finance`, `apps/health`,
`apps/career` — **Business and Content were deleted 2026-07-21**, their tables
deliberately kept; see `packages/shared/src/config/domains.ts` for ACTIVE vs
RETIRED domain keys). `apps/shell` is the central app that owns the router,
AppShell navigation (Sidebar/TopBar/BottomNav) and all cross-domain surfaces.
`packages/shared` (`@ct/shared`) holds api/stores/hooks/lib/theme/types + shared
components. `packages/ui` is `@ledgr/ui`.

The shell composes the domain apps into ONE deployed SPA — they are workspace
packages consumed from source via Vite aliases, **not** separately deployed
micro-frontends.

**Stack:** React 18 + TypeScript + Vite + `@ledgr/ui` + styled-components.
**No Ant Design** (removed 2026-07-21 — the whole package was bundled at 226 kB
to render one `Timeline`). **No Highcharts** — Recharts only. State: Zustand
(global) + React Query / TanStack (server state).

---

## Layout

```text
frontend/                      # pnpm workspace root (package.json = ALL third-party deps)
├── apps/
│   ├── shell/                 # @ct/shell — THE deployable Vite app (central top layer)
│   │   ├── src/
│   │   │   ├── router.tsx     # All routes + RequireAuth/RequireModule guards
│   │   │   ├── components/
│   │   │   │   ├── layout/    # AppShell, Sidebar, TopBar, BottomNav (all navigation/menus)
│   │   │   │   ├── dashboard/ # Dashboard card components
│   │   │   │   └── assistant/, onboarding/, CommandPalette, NotificationBell…
│   │   │   ├── features/agents/
│   │   │   └── pages/         # Dashboard, Chat, Agents, Goals, workspace/, settings/, guide/, legal/, landing…
│   │   ├── index.html · public/ · vite.config.ts (workspace aliases) · Dockerfile
│   ├── finance/               # @ct/finance — src/pages (FinancePage, FinanceSettingsPage) + src/components
│   ├── health/                # @ct/health — same shape
│   ├── career/                # @ct/career — same shape
│   ├── business/              # @ct/business — same shape
│   └── content/               # @ct/content — same shape
│
├── packages/
│   ├── ui/                    # @ledgr/ui component library (tsup build → dist/)
│   └── shared/                # @ct/shared — code any app may use
│       └── src/
│           ├── api/           # All HTTP calls — never call fetch/axios directly in components
│           ├── stores/        # Zustand stores (authStore, uiStore, notificationStore, dayEventsStore)
│           ├── hooks/ · lib/ · types/ · styled.d.ts
│           ├── theme/         # ctTheme.ts + layout.ts — all design tokens
│           └── components/    # ui/ (AreaTabs…), layout/ (WorkspaceLayout, AreaSettingsPage, PageLayout, PageDivider),
│                              # lumina/, widgets/, workspace/, UpgradeWall, AiInsightCard, CareerRadar
│
├── scripts/token-lint.mjs     # design-system drift ratchet
├── docs/                      # frontend-only docs (redesign plan, UI/UX audits)
├── Caddyfile                  # served by the web image (COPYd by apps/shell/Dockerfile)
├── pnpm-workspace.yaml        # workspace: apps/* + packages/*
├── package.json · tsconfig.json · vitest.config.ts · .npmrc · .dockerignore
```

---

## Architecture

- **Package graph:** `apps/shell` (`@ct/shell`) → depends on the 5 domain apps + `@ct/shared` + `@ledgr/ui`; each domain app (`@ct/finance|health|career|business|content`) → depends only on `@ct/shared` + `@ledgr/ui`. Domain apps NEVER import each other or the shell. Shell may deep-import a domain component (e.g. GoalsPage uses `@ct/finance/components/GoalsTab`).
- **Import specifiers:** `@/` = shell-internal only (`apps/shell/src`); `@ct/shared/...`, `@ct/<domain>/...` everywhere else. Aliases live in `apps/shell/vite.config.ts` + `tsconfig.json` paths + `vitest.config.ts` — keep the three in sync when adding a package.
- **Dependency policy:** all third-party deps are declared ONCE in `frontend/package.json` (single-version policy — guarantees one React/styled-components instance). Per-package manifests only declare the workspace graph (`workspace:*`).
- SPA via React Router v6 (in `apps/shell/src/router.tsx`); `RequireAuth` guard on all area routes.
- Feature areas: Finance / Health / Career — each is an app package with `src/pages` + `src/components`. Since the 2026-08-01 IA every sub-page is a **route** (`/app/finance/loans`), and the area page is a thin host that switches on `useAreaSection`. `AreaTabs` is retired.
- API: functions in `packages/shared/src/api/` — no raw fetch or axios in components.
- Styling: `styled.div` / `styled(Component)` everywhere; `className` in SC = CSS selector hook, NOT utility.
- `WorkspaceLayout` + `RailHeading` pattern: analytics/lists → center; inputs/forms → right 300px sticky rail.
- **Settings Layout**: Any settings page (global or domain-specific) MUST use the standard two-panel layout (`AreaSettingsPage`). Do not build inline settings tabs or custom settings layouts.
- `GlobalCapture` (⌘L): uses `@ledgr/ui Dialog`, parses NL text via `/captures/parse`, routes to correct domain.
- **WebSocket hooks:** `useChat.ts`, `useNotifications.ts`, `useVaultSync.ts` (backend counterparts in `backend/app/api/`).

---

## Design System — "Expressive" (direction set 2026-07-21)

**Tailwind is fully removed.** All styling is styled-components + `@ledgr/ui` theme tokens.

**`packages/ui/src/theme/tokens.ts` is THE authoritative token layer.** Until
2026-07-21 it was shadowed by a second layer in `ctTheme.ts` that overwrote
the palette, radii, shadows and fonts at runtime, so most of what the file
declared never rendered. `ctTheme.ts` now only picks a palette + mode and
calls `buildTheme()`.

| Token | Value |
|---|---|
| Background | `#FAFAF9` light / `#0C0A09` dark |
| Card | `#FFFFFF` light / `#1C1917` dark |
| Primary | `#1C1917` (near-black) |
| Accent / Gold | `#CA8A04` |
| Font (UI/body) | `DM Sans`, **16px body baseline** |
| Font (display) | `Playfair Display` — hero numerals + wordmark ONLY |
| Depth | 6-step `theme.elevation` + gradient + glass layers |
| Motion | duration/easing scales + 3 spring presets |

**HARD RULES:**
- Never use `hsl(var(--x))` — CSS vars are HEX; use `var()` or `color-mix()`.
- **No serif in body/UI.** `fontFamily.display` is for hero numerals and the wordmark.
- **There is no `mono` font.** The old token resolved to DM Sans (a proportional
  face wearing a mono name). Monospace display type is banned by standing user
  rule — use `tabularNums` from `@ledgr/ui` for figure alignment.
- **No pill / `9999px` radii.** True circles (avatar, status dot, Switch) exempt.
- No white/highlight shadows on **buttons or inputs**. ONE exception: the 1px
  top inner hairline inside `theme.elevation` on dark-mode raised surfaces —
  without it dark mode has no depth cue at all.
- Consume scales through the mixins (`textRole`, `focusRing`, `surface`,
  `glass`, `tabularNums`), not by hand — that is what stops the drift.
- Media queries use `theme.media.*`. Raw px breakpoints are a lint failure.
- **Run `node scripts/token-lint.mjs` before committing.** It ratchets against
  `scripts/token-lint.baseline.json` and fails when a violation count rises.
  `--report` lists locations; `--update` re-locks after a genuine reduction.
- **MOBILE STRICT**: In mobile/tab this app should feel like it's made natively for mobile/tab, not some app built for web and responsive to mobile. Design elements (especially KPIs) must compactly fit in single rows on small viewports rather than stacking loosely.

---

## Conventions

- **No magic numbers**: every spacing/color/radius traces to a theme token
- **No Tailwind classes**: Tailwind is removed — any `className` on SC components is a CSS selector hook
- **No `any` types**: TypeScript strict — use proper interfaces
- **Modals**: always use `@ledgr/ui Dialog`; never roll custom overlay/backdrop/portal
- **Forms**: plain controlled components + local state. (React Hook Form and Zod were listed here for a long time but had **zero import sites**; the packages were removed 2026-07-21. Reintroduce them deliberately if a form gets complex enough to need them.)
- **React Query**: always set `staleTime` on queries that don't need to refetch on every render

### UI/UX rules (always apply)

- **Navigation**: `apps/shell/src/config/navigation.ts` is the single source of truth. Sidebar, BottomNav, CommandPalette, breadcrumb labels and the `g`-goto shortcuts all read from it — never hand-write a nav list in a component. The sidebar is a **two-level tree** (5 groups → 9 areas → 34 destinations) as of 2026-08-01; the old "top-level links only, no accordions" rule is retired, and per-page filter rails (`ModuleSidebar`) are gone with it.
- **Routes have no `/areas/` prefix** — `/app/finance`, not `/app/areas/finance`. Goals/Projects/Sprints/Tasks live at `/app/plan?view=…&domain=…`; the old paths redirect.
- **Pages are module compositions, not layouts.** A page builds a `ModuleSpec[]` with `useMemo` from its API response and hands it to `ModuleGrid` (`@ct/shared/components/modules`). **21 module kinds** cover every destination (the canvas's 18 plus `hero`, `meters` and `agenda`, added 2026-08-02 for the hand-designed pages). Do not hand-roll a card grid — if a kind is missing, extend the kit. Interactivity is opt-in via optional handlers (`onAction`, `onRowClick`, `onToggle`, `onTileClick`, `onCardClick`, `onPrimary`/`onSecondary`, `onSelect`, `onSwatch`, `onMeterClick`, `onEntryClick`, `onChipToggle`); a module with no handler renders inert, which is what `/app/design` needs.
- **Card-header controls live on the module spec.** `action` (label) + `onAction` + `actionVariant` (`primary` | `ghost` | `link`) render a button; `actionNode` takes a ReactNode for controls a string cannot express (a `Select`, a week navigator) and renders BEFORE the button, so a header can have both. `actionNode` is the ONE slot in the spec language that takes elements — everything else stays data.
- **Never render a control that writes nowhere.** If the design asks for a switch over something the backend does not store, use read-only `rows` instead. Reference: `AppearanceSection` and `SecurityModules`.
- **Dialogs own destructive actions.** A `table`/`progress` row has no action column, so Edit opens on row click and Delete lives in the dialog footer.
- **No area owns goals.** Goals and milestones are set in **Workspace** for every domain (2026-08-02). An area page must not carry a goals destination, a goal editor, or a "Planning" section. The one exception is its **Overview**, which shows read-only progress via `useDomainGoalsModule(domain)` from `@ct/shared/hooks` — append its return to the page's `ModuleSpec[]` (it returns `null` when the domain has no active goals). Health Settings' Body/Fitness/Nutrition inputs are **targets**, not goals, and stay.
- **A page gets a title block only when it has page-scoped controls** (revised 2026-08-02, later). A page with nothing page-scoped starts at its content, breadcrumbs only — that part of the canvas holds. But a page that owns a control (per-area Settings, the workspace domain filter, Career's "Log entry") renders a titled header block above its content, and the control lives there. `PageContent` does this automatically: it shows a `PageHeader` iff something has been portalled. Nothing to wire per page.
- **Dashboard layout**: the canvas composition — greeting line · 4 KPI tiles · Today's Focus (7) beside Schedule (5) · 12-week activity heat, all through `ModuleGrid`. The old two-column shell with a 300px sticky calendar rail was removed 2026-08-02, along with BriefingCard / OverviewInsightCard / DiscoveriesFeed (files kept, unreferenced).
- **Density**: body baseline is **13px** (`body-m` 13/19) — re-scaled on 2026-08-01 to match the Claude Design canvas. This reversed the 2026-07-21 16px decision. Consume it through `textRole`, never a raw `font-size`.
- **Agents page**: dense table pattern — status, schedule, last-run, actions columns
- **Action-Rail**: inputs/forms always in right WorkspaceLayout rail; data/analytics in center
- **No pill/capsule shapes anywhere** — buttons, inputs, toggles, badges, progress bars all use `theme.radii.sm`/`md` (flat, ~8–10px corners), never `9999px`/`theme.radii.full`. Exception: true circles (avatars, status dots, the `Switch` track/thumb) where the shape is structural, not a corner-rounding choice. When adding any new rounded element, reference a `theme.radii.*` token — never hardcode a radius value.
- **Multi-option toggle/filter style (user-confirmed favorite, always use this for "All / Over / Near / On track"-style filters)**: `@ledgr/ui`'s `SegmentedControl` — light `theme.color.muted` track, white/card active segment with `theme.shadow.xs`, `theme.radii.md` corners (not pill-shaped). Do NOT use a `Select` dropdown for this pattern unless the option list is long (5+) or doesn't need every option visible at once — short status/range filters (≤4 options) should be `SegmentedControl`, not a dropdown.
- **Nothing page-scoped goes in the TopBar.** The TopBar is permanent app chrome — breadcrumbs, search, assistant, theme, notifications, account. A page's own Settings link or filter dropdown does not belong in it. It briefly did (2026-08-02, when `PageHeader` was retired app-wide); reverted the same day on Utsav's call. `usePageHeaderActions()` is now consumed by `PageContent` in `@ct/shared`, which renders `PageHeader` **inside the page's own content column** — title from the nav tree (published by `AppShell` through `PageIdentityProvider`, so no page hand-writes a section→label map), actions from the portal. `HeaderActionPortal` call sites did not change.
- **Where controls live.** First choice is the header of the card that owns them — `Card`'s `action` prop, or the module spec's `action`/`actionNode`. Use `AreaToolbar` only for a multi-control row (search + filters + view switcher) and put it INSIDE the card, above the list. Reach for `HeaderActionPortal` only when the action is scoped to the whole page rather than one card (per-area Settings, Career's "Log entry", the workspace domain filter, AreaSettingsPage's Back). **A control never floats between the page top and a card** — a bare filter row above a card is the one placement that is always wrong. If it filters a card, it goes in that card's header; if it is page-scoped, it goes through the portal into the page header.
- **`@ledgr/ui` `Dialog` icon renders inline, no background box** — `IconWrap` in `Dialog.tsx` has no `width`/`height`/`background`. The icon SVG renders bare alongside the eyebrow+title+description, exactly like the Card header icon. Never add a muted-bg container to the dialog icon.
- **Toolbar/action-row controls share a 32px height contract** — every interactive control that sits in a `Card` action row or `AreaToolbar` must render at exactly **32px** so they align on one baseline. Fixed at the ledgr-ui source (all `border-box`): `Button size="sm"` = 32px, `SegmentedControl size="sm"` = 32px (explicit `height` on `Root`), `DateNavBtn` = 32×32px, `ToolbarIconBtn` = `height:32px; padding:0 16px` (do NOT use vertical padding — it made it 37.5px and pushed it above the others). Never paper over a height mismatch with an inline `style={{ height: 32 }}` on the call site — fix the primitive. When adding a new toolbar control, measure it against 32px.
- **Per-area Settings button** — always `variant="outline" size="sm"` with `<Settings size={14} style={{ marginRight: 6 }} /> Settings` (NOT ghost, NOT icon-only), rendered inside a `HeaderActionPortal`. Finance/Health/Career are the references.
- **Always use `@ledgr/ui` `Card` directly — never build custom card wrapper components.** `Card` has `icon`/`title`/`subtitle`/`action` props that provide the full header layout. **Canonical reference: `apps/finance/src/components/TransactionsTab.tsx`.** Action items go in a small flex row (`gap: theme.spacing[2]`) passed as `action` — use a styled component (`CardActions` in `transactions/TransactionsTab.styles.ts`), not an inline `style`, or token-lint counts it. Always add `fullWidth={false}` to any `Select` inside `action` (without it Select fills the container and pushes buttons to a second line). Icon size = `16`. Never use `flex-wrap: wrap` on the inner action div.
- **WorkspaceLayout's `Main` is a flex column with `gap: 24px`** — direct children (grids, sections) must NOT also set their own `margin-top`, or spacing doubles (gap + margin-top stack additively). Let the parent `gap` handle inter-section spacing.

---

## Critical Gotchas

- **ledgr-ui edit → browser: rebuild + restart + MANDATORY verify.** Since the monorepo conversion (2026-07-20), `@ledgr/ui` is a `workspace:*` symlink — the old "copy dist into the pnpm store" dance is GONE. Sequence after editing `packages/ui` source: (1) `pnpm --filter @ledgr/ui build`; (2) `rm -rf apps/shell/node_modules/.vite` (Vite pre-bundles `@ledgr/ui` into its deps cache and keeps serving the stale copy); (3) **restart the dev server** (clearing `.vite` alone doesn't re-optimize a running server); (4) **verify in the browser by measuring** — `getBoundingClientRect()` via `preview_eval`, not by trusting the source. If you can't log in to reach the real page, add a throwaway public route rendering the components, measure, then delete it.
- **`@ledgr/ui` Dialog fires `onOpenChange` on CLOSE only** (Esc/overlay/close-button → `onOpenChange(false)`); it never calls `onOpenChange(true)`. So modal **reset/prefill must be driven by a `useEffect` on `[open, editing]`**, not an `onOpenChange(true)` branch (that branch never runs → stale/empty forms on reopen/edit). Same for any controlled Dialog.
- **Number `<Input>` needs `step`**: `min="0.01"` (or any non-integer min) with the default `step="1"` makes whole numbers *invalid* ("nearest valid values are 19.01 and 20.01"). Always pair a decimal `min` with `step="0.01"` (or `step="any"`) on currency/amount inputs.
- **CSS vars are HEX**: never `hsl(var(--x))` — use `var(--x)` or `color-mix()`
- **Recharts animation**: add `isAnimationActive={false}` to every `<Pie>/<Bar>/<Area>/<Line>` — default animation leaves shapes empty in headless/preview environments
- **The frontend must stay same-origin with the API.** `packages/shared/src/api/client.ts` uses a relative `/api` baseURL and the WS hooks use `location.host` — there is no absolute API URL anywhere. Any deploy topology that splits them (separate CDN/host for the SPA) breaks auth and WebSockets.
- **Finance datetimes: send NAIVE LOCAL, never `toISOString()`.** `dayjs(date).toISOString()` converts the picked local-midnight to UTC, which shifts the date back a day for users east of UTC (IST midnight → previous-day 18:30 UTC), so the txn renders on the wrong day. Send `dayjs(date).format('YYYY-MM-DD') + 'T' + dayjs().format('HH:mm:ss')`. Backend column truth: `backend/CLAUDE.md`.
- **Finance category picker**: categories are a 2-level DB tree keyed by `kind` (income vs expense) — no hardcoded category lists. Query key `['finance', 'categories']`. The txn form uses `CategoryPicker` (cascading flyout on desktop / drill-down on mobile, with inline create). **Account is required** on manual expense/income (422 without it). Backend model: `backend/CLAUDE.md`.

---

## Commands

All run from `frontend/`.

```bash
pnpm install                     # installs ALL workspace packages (root, apps/*, packages/*)
pnpm dev                         # shell dev server :5173 (= pnpm --filter @ct/shell dev)
pnpm build                       # builds @ledgr/ui then the shell app
pnpm test                        # vitest across apps/* + packages/*
pnpm --filter @ledgr/ui build    # rebuild the component library after editing packages/ui
./node_modules/.bin/tsc -p tsconfig.json   # typecheck the whole frontend monorepo
node scripts/token-lint.mjs      # design-token drift ratchet (--report / --update)
```

The web Docker image builds with `frontend/` as its context:
`docker build -f apps/shell/Dockerfile ./frontend` (from the repo root).

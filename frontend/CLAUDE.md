> Scope: the **frontend only**. Project-wide context is in the repo-root
> `CLAUDE.md`, which always loads too. Backend rules: `backend/CLAUDE.md`.

# Frontend — Control Tower

A pnpm workspace rooted at `frontend/`. React 18 · TypeScript · Vite ·
styled-components · `@ledgr/ui`. State is Zustand (client) plus React Query
(server). **No Tailwind, no Ant Design, no Highcharts** — Recharts only.

---

## Layout and package graph

```text
frontend/                    workspace root — ALL third-party deps live here
├── apps/
│   ├── shell/               @ct/shell — THE deployable Vite app
│   │   └── src/
│   │       ├── router.tsx           every route + the RequireAuth guard
│   │       ├── config/navigation.ts the single source of truth for nav
│   │       ├── components/layout/   AppShell, Sidebar, TopBar, BottomNav
│   │       └── pages/               Dashboard, Chat, Agents, Plan, Settings, …
│   ├── finance/             @ct/finance — src/pages + src/components
│   ├── health/              @ct/health
│   └── career/              @ct/career
├── packages/
│   ├── shared/              @ct/shared — api · stores · hooks · lib · theme · types · components
│   └── ui/                  @ledgr/ui — the component library (tsup → dist/)
└── scripts/token-lint.mjs   design-token drift ratchet
```

The shell composes the domain apps into **one** SPA. They are workspace packages
consumed **from source** through Vite aliases, not separately deployed
micro-frontends.

- `apps/shell` depends on the three domain apps, `@ct/shared` and `@ledgr/ui`.
- Each domain app depends only on `@ct/shared` and `@ledgr/ui`.
- **Domain apps never import each other or the shell.**

**Import specifiers.** `@/` is shell-internal only. Everything else is
`@ct/shared/…` or `@ct/<domain>/…`. The aliases are declared in three files that
must agree: `apps/shell/vite.config.ts`, `tsconfig.json` paths, and
`vitest.config.ts`.

**Dependency policy.** Every third-party dependency is declared once, in
`frontend/package.json`. Per-package manifests declare only workspace edges
(`workspace:*`). This is what guarantees a single React and a single
styled-components instance.

`@ledgr/ui` is the one package consumed through its build output rather than its
source, so `packages/ui/dist` must exist before `tsc` or vitest will resolve it.
The root `prepare` script builds it during `pnpm install`, so a fresh clone
works; after editing `packages/ui` source, run `pnpm build:ui` again.

---

## Pages are compositions, not layouts

A page builds a `ModuleSpec[]` with `useMemo` from its API response and hands it
to `ModuleGrid` (`@ct/shared/components/modules`). Twenty-one module kinds cover
every destination. **Do not hand-roll a card grid** — if a kind is missing,
extend the kit.

Interactivity is opt-in through optional handlers (`onAction`, `onRowClick`,
`onToggle`, `onTileClick`, `onCardClick`, `onSelect`, …). A module with no
handler renders inert, which is what `/app/design` relies on.

Card-header controls live on the spec: `action` + `onAction` + `actionVariant`
render a button; `actionNode` takes a ReactNode for a control a string cannot
express (a `Select`, a week navigator) and renders before the button.
`actionNode` is the only slot in the spec language that takes elements —
everything else stays data.

**Never render a control that writes nowhere.** If a design calls for a switch
over something the backend does not store, use read-only `rows` instead.

**Dialogs own destructive actions.** A table row has no action column, so Edit
opens on row click and Delete lives in the dialog or panel footer.

---

## Design system

`packages/ui/src/theme/tokens.ts` is the authoritative token layer.
`ctTheme.ts` only picks a palette and mode and calls `buildTheme()`.

| Token | Value |
|---|---|
| Background | `#FAFAF9` light · `#0C0A09` dark |
| Card | `#FFFFFF` light · `#1C1917` dark |
| Accent | `#CA8A04` |
| UI font | DM Sans, 13px body baseline (`body-m` 13/19) |
| Display font | Playfair Display — hero numerals and the wordmark **only** |

**Hard rules**

- Consume scales through the mixins (`textRole`, `focusRing`, `surface`,
  `glass`, `tabularNums`) — not by hand. That is what stops the drift.
- Media queries use `theme.media.*`. A raw px breakpoint is a lint failure.
- **One card corner: `theme.radii.md`.** Page headers, `Card`, `KpiCard`,
  `StatCard`, `ChartCard`, `DataTable` and every `ModuleGrid` tile share it, so a
  page reads as one material. `radii.lg` and above are for overlay chrome —
  popovers, menus, dialogs — never a card. **Cite the token, never a pixel
  figure**; `tokens.ts` is the only place a number is correct.
- **No pill or capsule shapes.** Buttons, inputs, toggles, badges and progress
  bars use `radii.sm`/`md`. True circles (avatars, status dots, the `Switch`
  track) are structural and exempt.
- **No serif in body or UI**, and there is no mono font — use `tabularNums` for
  figure alignment.
- No white or highlight shadows on buttons and inputs. The one exception is the
  1px top inner hairline in `theme.elevation` on dark raised surfaces, without
  which dark mode has no depth cue at all.
- **Toolbar controls share a 32px height contract.** `Button size="sm"`,
  `SegmentedControl size="sm"` and `IconButton size="sm"` all render at exactly
  32px. Never paper over a mismatch with an inline `style={{ height: 32 }}` —
  fix the primitive.
- For a short (≤4 option) status or range filter, use `SegmentedControl`, not a
  `Select`.
- **Mobile is not an afterthought.** The app should feel built for the phone, not
  reflowed onto it. KPI rows stay compact and scroll-snapped rather than
  stacking into a tall loose column.

Run `node scripts/token-lint.mjs` before committing. It ratchets against a
baseline and fails when a violation count rises. `--report` lists locations;
`--update` re-locks after a genuine reduction.

---

## Conventions

- **All HTTP goes through `packages/shared/src/api/`.** No raw fetch or axios in
  a component.
- **Modals are always `@ledgr/ui` `Dialog`.** Never roll a custom
  overlay/backdrop/portal.
- **No `any`.** ESLint ratchets the existing count; adding one fails the build.
  For API errors use `errorMessage(err, fallback)` from `@ct/shared/lib/utils`.
- **Set `staleTime`** on React Query queries that need not refetch constantly.
- **`navigation.ts` is the only nav list.** Sidebar, BottomNav, CommandPalette,
  breadcrumbs and the `g`-goto shortcuts all read from it.
- **Nothing page-scoped goes in the TopBar.** It is permanent app chrome —
  breadcrumbs, search, assistant, theme, notifications, account.
- **Goals belong to Workspace, not to an area.** An area page may show read-only
  progress via `useDomainGoalsModule(domain)`, and nothing else.

---

## Gotchas

- **`@ledgr/ui` `Dialog` fires `onOpenChange` on CLOSE only.** It never calls
  `onOpenChange(true)`, so modal reset and prefill must be driven by a
  `useEffect` on `[open, editing]`. An `onOpenChange(true)` branch never runs,
  which is how a form ends up stale or empty on reopen.
- **A number `<Input>` with a decimal `min` needs `step`.** `min="0.01"` with the
  default `step="1"` makes whole numbers *invalid* ("nearest valid values are
  19.01 and 20.01"). Pair a decimal min with `step="0.01"`.
- **Recharts needs `isAnimationActive={false}`** on every `<Pie>` / `<Bar>` /
  `<Area>` / `<Line>`, or shapes render empty in headless environments.
- **Finance datetimes: send naive local, never `toISOString()`.**
  `dayjs(date).toISOString()` converts local midnight to UTC, which moves the
  date back a day for anyone east of UTC, and the transaction lands on the wrong
  day. Send `dayjs(date).format('YYYY-MM-DD') + 'T' + dayjs().format('HH:mm:ss')`.
  The column-side rule is in `backend/CLAUDE.md`.
- **After editing `packages/ui` source**: `pnpm build:ui`, then
  `rm -rf apps/shell/node_modules/.vite`, then restart the dev server — Vite
  pre-bundles `@ledgr/ui` and keeps serving the stale copy otherwise. Then verify
  by measuring in the browser, not by reading the source.
- **The frontend must stay same-origin with the API.** `api/client.ts` uses a
  relative `/api` baseURL and the WebSocket hooks use `location.host`. There is
  no absolute API URL anywhere, deliberately.

---

## Commands

```bash
pnpm install            # installs everything and builds @ledgr/ui
pnpm dev                # shell dev server on :5173
pnpm build              # @ledgr/ui, then the shell
pnpm build:ui           # just the component library
pnpm typecheck          # tsc over the whole workspace
pnpm lint               # eslint, ratcheted at 289 warnings
pnpm exec vitest --run  # 81 tests
node scripts/token-lint.mjs
```

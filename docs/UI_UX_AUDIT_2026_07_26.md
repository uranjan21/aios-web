# UI/UX Audit — Control Tower
**Date:** 2026-07-26  
**Scope:** All area pages (Finance, Health, Career), shell pages, shared layout, and card system.  
**Status legend:** 🔴 High · 🟡 Medium · 🟢 Low

---

## 1. Global Page Layout — No Defined Contract

### 1.1 🔴 No canonical page anatomy document
Every area page assembles its own structure ad hoc. There is no written spec defining what a page's "zones" are (page padding → content grid → header zone → KPI row → card grid → content area). This is why spacing, gap values, and zone sizes drift page by page.

**Evidence:** `HealthPage.tsx` uses `paddingRight: '1rem', paddingBottom: '2rem'` inline on its dashboard render function while Finance's `HomeTab.tsx` applies no top-level padding override, relying entirely on `PageContainer`. They end up visually different without a structural reason.

**Fix:** Define a single `PageAnatomy` section in the design system:
- `PageContainer` → padding from `layout.ts` `PAGE_PADDING`
- `PageContent` → max-width + vertical `gap: spacing[6]`
- `<PageHeader>` → always first child of `PageContent`, uniform height
- `<PageDivider>` → present on workspace/tool pages only (already documented but not consistently enforced — see §3)
- KPI row (`KpiGrid`) → always a direct child of `ContentPane`, no wrapper
- Card grid → directly below KPI row with one consistent gap

---

## 2. Card System Inconsistencies

### 2.1 🔴 `GlassCard` (custom styled wrapper) co-exists with plain `Card` from `@ledgr/ui`
In `HomeTab.tsx` (Finance), a `const GlassCard = styled(Card)` with its own `border`, `background`, `backdrop-filter`, `box-shadow`, and hover `transform` is defined locally. `KpiCard` in `packages/ui/src/patterns/KpiCard.tsx` also defines its own `StyledCard = styled(Card)` with the same gradient/glass treatment.

This means the same visual goal (a glass-surface card) is implemented in **at least three places** with slightly different values, producing cards that look almost-but-not-quite the same.

**Affected files:** `HomeTab.tsx`, `KpiCard.tsx`, `WorkspaceLayout.tsx` (`StyledRail`), `ModuleSidebar.tsx`.

**Fix:** Promote one canonical glass surface to `@ledgr/ui Card` via a `variant="glass"` prop. Delete all local `styled(Card)` wrappers.

### 2.2 🔴 Some cards have no header; others have a full header + inner sub-header box
The `Financial Health` card on the Finance overview (screenshot 1) renders:
- A `Card` header (title + subtitle from DS `Card` props)
- **AND** an inner nested section with "100 / 100" that acts as a second header

This creates a card-within-a-card visual when the sub-rows (Savings Rate, Debt-to-Income) start. The `ProgressBar` section rows have no clear relationship to the outer card header.

Similarly, some cards in the Subscriptions and Top Categories area (screenshot 2) have a card header with a filter dropdown action — but then render another box/border inside for the empty state, creating a double-bordered look.

**Fix:** Cards that contain list items or progress rows should NOT render an inner content box with a border. The DS `Card` body padding handles the inset already. Audit every card that renders a `styled.div` with `border`, `border-radius`, or explicit `background` inside a `Card`.

### 2.3 🟡 `FinancialHealth` card scrollable content is clipped with no scroll affordance
The Financial Health card (screenshot 1) shows four metric rows (Savings Rate, Debt-to-Income, Emergency Fund, Budget Adherence) with the last one ("No budgets set") partially visible and cut off. There is no scroll indicator, shadow fade, or "show more" control.

**Fix:** Add `overflowY: 'auto'` + a bottom fade mask (`-webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%)`) to the card body, or set a minimum height that fits all rows.

### 2.4 🟡 `InboxTab` empty state (screenshot 3) is a full-page centered layout inside a card body
The "Inbox is empty" state (screenshot 3) centres content in what looks like the full viewport height, but it's inside a card. The card itself has no visible boundary, so the empty state appears to float in the page background.

**Fix:** Give the card a defined `minHeight` so its boundary is always visible, even when empty.

### 2.5 🟡 Subscriptions card has an inner box with its own border radius
Screenshot 2 (Subscriptions card): the empty-state message is wrapped in a `styled.div` with its own border and `border-radius`, nested inside the `Card`. This creates two stacked rounded rectangles — outer card + inner box — which is the "additional box / card-like structure" the user flagged.

**Fix:** Remove the inner wrapper; use `EmptyState` from `@ledgr/ui` directly inside the `Card` body.

---

## 3. `PageHeader` Inconsistencies

### 3.1 🔴 `eyebrow` prop used on Health + Career but not Finance
- `HealthPage.tsx` passes `eyebrow="Wellness"` to `PageHeader`.
- `CareerPage.tsx` passes `eyebrow="Growth"`.
- `FinancePage.tsx` passes **no eyebrow** — just `title="Finance Center"`.

From the screenshots: Finance header shows no eyebrow label above the title, while Health does. This is visible asymmetry across the three primary area pages.

**Fix:** Either add eyebrows to all area headers (`eyebrow="Finance"`) or remove them from Health and Career. Decide one pattern and enforce it.

### 3.2 🟡 `PageDivider` rule is documented but inconsistently applied
The CLAUDE.md rule states: "area pages (Finance/Health/Career/…) → NO PageDivider after PageHeader." But `HealthPage.tsx` **does** render a `<PageDivider />` immediately after the `PageHeader`. `FinancePage.tsx` also renders `<PageDivider />`.

Both area pages break the stated rule. Either the rule is wrong and should be updated, or the dividers need to be removed.

### 3.3 🟢 Finance `PageHeader` icon is `<LayoutDashboard>` (a tab icon, not an area icon)
`FinancePage.tsx` passes `icon={<LayoutDashboard size={24} />}` — which is the same icon used for the "Overview" sidebar tab. This gives Finance no distinct identity icon at the page level. Health uses `<Heart />` which is purpose-built.

---

## 4. KPI Row Inconsistencies

### 4.1 🔴 `sub` prop on `KpiCard` renders as a card-level subtitle, which the CLAUDE.md rule says shouldn't appear on area-page KPI cards
Health Dashboard (HealthPage.tsx) uses KpiCards with `sub="Latest logged body weight"`, `sub="Consecutive days with a workout"`, etc. This renders a subtitle line under the card header label — adding vertical height and crowding the KPI tile.

The user specifically called this out: "KPIs also have subtext below card header, which shouldn't be the case."

`BodySleepTab.tsx`, `FitnessTab.tsx`, and `NutritionTab.tsx` all use the same `sub=` pattern.

**Fix:** Remove `sub=` from all KPI cards in area pages. The label is self-explanatory; the sub is redundant ink.

### 4.2 🔴 No consistent vertical gap between KPI row and card grid below it
In `HealthPage.tsx`, the `StyledKpiGrid` has no bottom margin token — only a conditional `padding-bottom: spacing[1]` on mobile scroll mode. The `StyledDashboardGrid` immediately follows with no explicit top margin.

The gap between KPIs and the first content card is controlled only by the `ContentPane`'s `gap: spacing[6]` — but `StyledKpiGrid` and `StyledDashboardGrid` are children of the same `div` inside `renderDashboard`, meaning they inherit the **parent div's implicit flow**, not the `ContentPane` flex gap.

**Result:** The KPI row and card grid are separated only by whatever margin the browser computes — no reliable token-level gap. On some sub-pages this collapses to near-zero.

**Fix:** Wrap the dashboard render in a flex column with `gap: spacing[6]`, or give `StyledKpiGrid` an explicit `margin-bottom: spacing[6]`.

### 4.3 🟡 Health Dashboard uses a local `StyledKpiGrid` instead of the DS `KpiGrid` component
`HealthPage.tsx` defines its own `StyledKpiGrid` styled component that duplicates the scroll/snap/grid behaviour that already exists in `packages/ui/src/patterns/KpiCard.tsx` as `KpiGrid`. `BodySleepTab.tsx` and `FitnessTab.tsx` import and use the DS `KpiGrid`, but `HealthPage.tsx` doesn't.

**Fix:** Replace `StyledKpiGrid` in `HealthPage.tsx` with `import { KpiGrid } from '@ledgr/ui'`.

---

## 5. Spacing & Layout Token Violations

### 5.1 🔴 Hardcoded `1rem` and `2rem` gaps throughout area components
`HealthPage.tsx` uses `gap: 1rem` in multiple styled components (`StyledDashboardGrid`, `StyledGridItemSide`). `BodySleepTab.tsx`'s `StyledContainer`, `StyledChartsGrid`, `StyledListWrapper`, and others use `gap: 1rem`. This bypasses the token scale entirely.

`1rem` = 16px which happens to be `spacing[4]` in the 4pt grid, but it's fragile — if the base font size changes or the token scale shifts, every hardcoded `1rem` drifts silently.

**Fix:** Replace all `gap: 1rem` / `gap: 0.5rem` / `gap: 0.25rem` occurrences with `gap: ${({ theme }) => theme.spacing[4]}` etc.

### 5.2 🟡 `WorkspaceLayout` `gap` is `spacing[6]` but area tab content uses its own internal gaps inconsistently
`ModuleLayout`'s `ContentPane` uses `gap: spacing[6]`. But when a tab component (e.g. `BodySleepTab`, `NutritionTab`) is rendered inside `ContentPane`, it wraps itself in a `WorkspaceLayout` (from `@ct/shared`), which adds **another** `gap: spacing[6]` flex column. This can produce double-spaced sections (gap + gap stacking).

**Fix:** Tab components that render inside `ContentPane` must not add their own outer flex gap. Only the `ContentPane` controls section-to-section gaps.

### 5.3 🟡 `HealthPage.tsx` dashboard uses inline `style={{ paddingRight: '1rem', paddingBottom: '2rem' }}` on the dashboard wrapper
This is a raw pixel override that bypasses the layout token system and creates asymmetric padding (right pad but not left, bottom but not top).

---

## 6. Content Overflow Without Scroll

### 6.1 🔴 Cards with list content have no overflow scroll when content exceeds card height
Several cards (Financial Health, Subscriptions list, Payables list) contain vertically-stacked rows. When the content exceeds the card's visible area, it clips without any scroll mechanism or height-limiting behaviour. The user must scroll the whole page rather than the card.

**Fix:** For cards designed as lists, set `overflowY: 'auto'` + `maxHeight` on the card body, or impose `minHeight` + `maxHeight` so the card stabilises at a predictable height.

### 6.2 🟡 `KpiGrid` on mobile uses hidden scrollbar — no affordance
The `KpiGrid` uses `mask-image` to hint at overflow, but the mask only covers the right 10% and disappears at the `sm` breakpoint. On medium viewports between `sm` and `lg`, KPI grids can collapse or overflow invisibly.

---

## 7. Area Pages — Sub-Tab Structure Inconsistencies

### 7.1 🔴 Health area tabs (Body & Sleep, Nutrition, Fitness, History) each use `WorkspaceLayout` directly as their root — producing a second sidebar rail inside the already-sidebar-driven layout
`BodySleepTab.tsx`, `NutritionTab.tsx`, and `FitnessTab.tsx` all render `<WorkspaceLayout rail={...}>` or `<WorkspaceLayout rail={undefined}>` as their outermost element. But they're already inside `ModuleLayout`'s `ContentPane`, which is the main content region to the right of `ModuleSidebar`.

The result is an unnecessary nesting: `ContentPane → WorkspaceLayout (Root flex-row) → Main (flex col)`. When `rail={undefined}`, the `Root` is rendered but the `StyledRail` is skipped, leaving just dead wrapper markup. When `rail` has content, the WorkspaceLayout injects a second fixed-width `288px` pane inside the already-constrained content area, which can overflow on mid-sized screens.

**Fix:** Tab components should render their content directly (a flex column or grid), not wrap themselves in `WorkspaceLayout`. `WorkspaceLayout` is for pages (like `SimulatorTab`) that explicitly need the right-rail input pattern.

### 7.2 🟡 Fitness tab uses `HeaderActionPortal` to inject a "Log Workout" button into the page header — but this portal is not used consistently across tabs
Some tabs inject actions via `HeaderActionPortal`; others place buttons inline in the tab body. This inconsistency makes the page header feel different depending on which tab is active.

**Fix:** Standardise: either always use `HeaderActionPortal` for primary tab actions, or always use in-card actions. Per CLAUDE.md: "If a tab only has a SINGLE button … place the button on the right side of the Card's header."

---

## 8. Mobile Layout

### 8.1 🟡 Health Dashboard grid uses two column zones (`8/12` + `4/12`) that collapse to full-width on `belowLg` but the sidebar also collapses — producing a very long scroll on mobile
On mobile, the ModuleSidebar renders above the content, then the KPI row, then the weight chart card, then the water tracker, then the AI card — five vertically stacked sections with no condensed entry point.

**Fix:** On mobile, either hide the sidebar behind a bottom sheet / hamburger, or collapse the dashboard to just KPIs + one priority card with a "See more" link to sub-tabs.

### 8.2 🟢 `StyledKpiGrid` on mobile has `min-width: 140px` KPI cards but no max-width, so on large phones with 5 KPIs they overflow into a horizontal scroll that fights the page scroll
The `BodySleepTab` uses `KpiGrid $cols={5}` — five columns at `minmax(0, 1fr)` on `sm`. On narrow phones this makes each card ~64px wide, which is too tight for the label text.

---

## 9. Design Token & Styling Violations

### 9.1 🔴 Local `GlassCard` in `HomeTab.tsx` applies `transition: all 0.3s ease` and `transform: translateY(-2px)` on hover
The design system's motion spec (CLAUDE.md) mandates `120/200ms` and `cubic-bezier(0.2, 0, 0, 1)`. `0.3s ease` is both too slow and uses the wrong easing curve.

The same violation exists in `KpiCard.tsx`'s `StyledCard`.

### 9.2 🟡 Hardcoded hex / rgba colours in multiple components
- `HomeTab.tsx`: `rgba(30, 32, 40, 0.8)`, `rgba(255, 255, 255, 0.95)`, `rgba(0, 0, 0, 0.1)`, `rgba(0, 0, 0, 0.08)`, `rgba(0, 0, 0, 0.05)`
- `ModuleSidebar.tsx`: `rgba(255, 255, 255, 0.08)`, `rgba(0, 0, 0, 0.05)`
- These should reference `theme.elevation` or `theme.color.*` tokens.

### 9.3 🟢 `BodySleepTab.tsx` list items use `rgba(45, 49, 58, 0.15)` as a border colour
This hardcodes a dark-mode-leaning dark value that will look wrong in light mode against the `#FAFAF9` background.

---

## 10. Specific Screenshot Observations

### Screenshot 1 — Financial Health card
- **Double-level header:** Outer card has title "Financial Health" + subtitle "Your overall financial score" + a "Current ▼" dropdown action. Then directly below the `<hr>` there's a `100 / 100` metric that acts as its own sub-header. These should collapse into one — the score can live in the card header's action slot, or as the primary KpiCard value.
- **Debt-to-Income has a score (100) + full-width green progress bar, but Savings Rate and Emergency Fund show only a dash.** The visual hierarchy is inconsistent: one metric is "full featured" (with a bar) and the others are text-only.
- **Truncated last row:** "No budgets set" is partially visible at the card bottom edge — no scroll affordance.

### Screenshot 2 — Subscriptions + Top Categories + Financial Insights + Explain Month
- **Subscriptions card:** Inner "No subscriptions" empty state is wrapped in a bordered, rounded box — double card appearance.
- **Top Categories card:** Has no inner box, content flows directly — inconsistent with Subscriptions.
- **Financial Insights card:** Uses an alert/warning icon circle with a yellow ring. This is a different icon style from the rest of the app (inline icons, no circles).
- **Explain Month card:** Has a nested "Explain This Month" sub-card with its own `*+` icon and "Analyse" button — this is another card-within-a-card pattern.
- **Card density:** The four 2×2 grid cards have very different content heights. Bottom cards (Financial Insights, Explain Month) are taller with more whitespace than the top row — the grid should use `align-items: stretch` and a uniform min-height.

### Screenshot 3 — Inbox empty state
- Empty state icon (inbox tray) and "Inbox is empty" text appear to float in an all-white space with no card boundary visible. The surrounding page background and the card surface are both white, making the card invisible.
- **Fix:** Add a visible border (`1px solid theme.color.border`) to the card in light mode, or use a subtle background tint to distinguish the card surface.

---

## 11. Missing Global System Definitions

### 11.1 🔴 No defined "area page template"
Every area page (`HealthPage`, `FinancePage`, `CareerPage`) independently assembles: header, divider (or not), sidebar, content pane, KPI row, and tab content. There is no `AreaPageTemplate` component that enforces this sequence.

**Proposed canonical structure:**
```
<PageContainer>           ← ambient mesh, page-level padding
  <PageContent>           ← max-width, flex col, gap: spacing[6]
    <PageHeader ... />    ← always present; eyebrow uniform across areas
    [no PageDivider]      ← area pages = no divider (rule already documented, not enforced)
    <ModuleLayout         ← sidebar + content split
      sidebar={<ModuleSidebar />}
    >
      <KpiGrid>...</KpiGrid>   ← always first in ContentPane
      {tabContent}             ← tab-specific grid/cards below
    </ModuleLayout>
  </PageContent>
</PageContainer>
```

### 11.2 🔴 No defined card grid contract
Card grids inside tabs use different column counts, gap values, and min-heights depending on who wrote the tab. There is no `ContentGrid` component or documented "how many columns on what breakpoint" rule.

**Proposed rule:**
- 1 column below `sm`
- 2 columns `sm`→`lg`
- 3–4 columns above `lg` (depends on card type: analytics = 2 max, KPI = 4)
- Gap always `spacing[4]` (16px) inside a card grid; `spacing[6]` (24px) between sections

### 11.3 🟡 No defined empty-state contract
Empty states vary across cards:
- Some use `@ledgr/ui EmptyState`
- Some use plain centred `<div>` with text
- Some use a nested bordered box (the "double card" issue)
- Some have icons, some don't
- Icon sizes and colours differ

**Fix:** All empty states inside cards must use `@ledgr/ui EmptyState`. Never wrap an empty state in a custom bordered `div`.

---

## 12. Backlog / Lower Priority

| # | Issue | Severity |
|---|-------|----------|
| 12.1 | `BodySleepTab` list item hover uses `rgba(45, 49, 58, 0.02)` — invisible in both light and dark mode | 🟢 |
| 12.2 | `NutritionTab` `StyledListItemSubtitle` and `StyledListItemTitle` use `font-size: 0.875rem` (hardcoded, not a token) | 🟢 |
| 12.3 | `FitnessTab` renders a `StyledBadgesWrapper` with horizontal scroll for exercise badges — no fade mask | 🟢 |
| 12.4 | Career `KpiGrid` uses no `$cols` prop, defaulting to 4 — on a page with 3 KPIs, the 4th cell is empty | 🟢 |
| 12.5 | `WaterTrackerWidget` has its own card-style container with explicit box-shadow — not using DS Card | 🟢 |

---

## Recommended Fix Priority Order

1. **Define the area page template** (§11.1) — blocks everything else; this is the root cause of most drift.
2. **Canonicalise the glass card** to `Card variant="glass"` (§2.1) — removes the three competing implementations.
3. **Remove `sub=` from all KPI cards** (§4.1) — one-line change per site, visible win.
4. **Fix KPI→card-grid gap** (§4.2) — add `margin-bottom: spacing[6]` to `KpiGrid` wrapper.
5. **Unify `eyebrow` on all area `PageHeader`s** (§3.1).
6. **Remove `WorkspaceLayout` from Health sub-tabs** (§7.1).
7. **Fix overflow/scroll on tall list cards** (§6.1 / §2.3).
8. **Replace hardcoded `1rem` gaps with tokens** (§5.1).
9. **Fix motion values on glass cards** (§9.1).
10. **Audit and replace all nested inner boxes inside cards** (§2.2 / §2.5).

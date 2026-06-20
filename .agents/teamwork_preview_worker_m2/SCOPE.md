# Scope: Visual & Accessibility Fixes (Milestone 2)

## 1. Visual Inconsistencies & Hardcoded Colors (R1)
- **LoginPage.tsx**:
  - Replace hardcoded color `#ffffff` on logo text.
  - Replace hardcoded colors in `HeroBlob` with proper theme styles or mappings.
  - Fix styling on line 480 that uses non-existent CSS variable `var(--muted-fg)` (replace with `theme.color.mutedForeground`).
  - Standardize `DOMAIN_COLORS` to map keys to proper theme-compliant color names or use dynamic styled components.
- **ChatPage.tsx**:
  - Replace CSS variables in `TOOL_META`, fallback color, `Bot` styles, `Archive` styles, `Wifi`, `WifiOff` with `theme.color.*` mapping (e.g. `theme.color.primary`, `theme.color.accent`, `theme.color.mutedForeground`, `theme.color.success`, `theme.color.destructive`).
- **AgentsPage.tsx**:
  - Replace style and background mapping variables (`var(--color-primary)`, `var(--color-accent)`, `var(--color-muted)`) with theme tokens.
  - Fix pulse glow keyframes using hardcoded colors (use rgba derived from `theme.color.accent`).
- **SettingsPage.tsx**:
  - Replace variables `var(--color-muted)`, `var(--color-accent)`, `var(--color-primary)` inside gauges and mapping blocks with theme tokens.
  - Replace hardcoded active borders/backgrounds on `PushBtn` (`rgba(248, 209, 104, ...)`) with `theme.color.accent` and `theme.color.border`.
- **IntegrationsPage.tsx**:
  - Replace `var(--foreground)` and `var(--muted-foreground)` style strings with theme tokens.
- **Finance, Health, Career, Business, Content Pages**:
  - Replace hardcoded colors in charts and widgets (e.g., `#ef4444`, `#f59e0b`, `#10b981`, `#F8D168`, `#F4A261`, `#16a34a`) with theme colors.
  - For Highcharts and Recharts configuration blocks, retrieve theme color tokens dynamically in the render function using `useTheme()` from `styled-components` and pass them to the charts.
  - Replace direct hex opacity formatting like `${theme.color.muted}80` with clean alpha composition or correct translucent theme colors.

## 2. Accessibility & UX Interaction (R2)
- **Keyboard Navigation (Focus Rings)**:
  - Add visible focus rings using `theme.color.ring` (`#CA8A04`) on `:focus-visible` for all interactive elements (buttons, links, tab buttons, clickable cards).
  - LoginPage: Add `:focus-visible` ring on `<DemoLink>`.
  - ChatPage: Fix `IconButton` and `QuickPromptButton` focus rings using `theme.color.ring` instead of `theme.color.primary`. Remove `outline: none` without replacements in `NewSessionBtn` (add ring).
  - SettingsPage: Add focus visible outline to `RetryBtn`.
  - Sidebar: Add focus ring to `NavItemLink` and `ToggleButton`.
  - TextTabs: Add focus ring to `TabBtn`.
- **Form Association (Labels)**:
  - Ensure all form inputs (e.g., email/passphrase in `LoginPage.tsx`, rename session input in `ChatPage.tsx`, Switch toggles in `AgentsPage.tsx`) have associated `<label>` elements or explicit `aria-label` / `aria-labelledby` attributes.
- **Loading Skeletons**:
  - In `ChatPage.tsx`, render skeleton loaders or spinners when loading sessions (`sessions === undefined`) or initially loading messages instead of immediately defaulting to showing "No past sessions" or `EmptyStateContainer`.
- **Z-Index Conflicts & Stacking**:
  - TopBar: Set `position: relative` (or `sticky`/`absolute`) on `HeaderRoot` so that its `z-index: 30` is active and prevents content elements from rendering over its dropdowns.
- **Inactive Tab Contrast & Touch Targets**:
  - TextTabs: Increase inactive tab text color contrast ratio on `theme.color.muted` background to meet WCAG AA (>= 4.5:1). Increase button height to >= 36px (preferably 44px on mobile) for touch target compliance.

## 3. Structural Refactoring
- **PageHeaders & Action Buttons**:
  - Remove all `<PageHeader>` tags inside the content areas of `DashboardPage.tsx`, `FinancePage.tsx`, `HealthPage.tsx`, `CareerPage.tsx`, `BusinessPage.tsx`, and `ContentPage.tsx` (as page titles are already visible in the top header breadcrumb).
  - Move page action buttons (e.g. "Add Transaction", "Log Health Data", "Add Career Item", "Log Business Event", "Capture Idea") into a `<PageToolbar>` toolbar located directly below `<AreaTabs>`.
  - Fix `AreaToolbar.tsx` and `PageLayout.tsx` to correctly accept and render the `title` prop and show title-only toolbars when no children are present.
- **Sidebar Background Theme Flipping**:
  - Avoid using `theme.color.primary` for the sidebar background (which flips to white in dark mode). Lock the sidebar background to dark neutral `#1C1917` in both modes, and ensure high contrast for active links and gold icons.

## 4. Critical Functional Bug
- **Kanban Column Draggability in ContentPage.tsx / ColumnDropZone.tsx**:
  - Update `ColumnDropZoneProps` to accept action callbacks (`onEdit`, `onSchedule`, `onDelete`, `activeId`).
  - Inside `ColumnDropZone`, map the items list to the draggable `<ItemCard>` component instead of the static `<Card>` from `@ledgr/ui`.

## 5. Verification
- Verify build compiles with zero errors using `pnpm build` in the `frontend` directory.

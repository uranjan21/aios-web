# Project: AIOS Web UI/UX Enhancement & Build Verification

## Architecture
- **Frontend SPA**: React 18 + TS + Tailwind + Ant Design.
- **Routing**: React Router v6 mapping to Pages (`DashboardPage`, `LoginPage`, `ChatPage`, `AgentsPage`, `SettingsPage`, `IntegrationsPage`, and Area pages).
- **Global Theme**: Stored in `aiosTheme.ts`, customized Deep Cobalt palette mapped to Light and Dark modes.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | **Codebase Exploration & Analysis** | Locate visual inconsistencies, hardcoded values, custom colors, missing cursors, transitions, focus rings, bento grids, page transitions, and responsive issues. | None | DONE |
| 2 | **Visual & Accessibility Fixes (R1 & R2)** | Standardize design tokens, add hover cursors, active transitions, focus rings, z-index validation, labels, loading states. | Milestone 1 | DONE |
| 3 | **Premium UI/UX Polish (R3)** | Implement Dashboard Bento grid, count-up animations, page transitions, Sidebar accent, glassmorphic TopBar, card hover micro-interactions. | Milestone 2 | DONE |
| 4 | **Responsive Layout & Build Verification (R4 & R5)** | Verify layouts at 375px/768px/1440px and compile via `pnpm build` in `frontend/`. | Milestone 3 | DONE |
| 5 | **Forensic Audit & Integrity Gate** | Perform independent static analysis and check for mock/hardcoded implementations. | Milestone 4 | DONE |
| 6 | **Resolve Follow-up UI/UX Issues (R1-R4)** | Implement unified toolbar & pinned actions, strict card/table wrapper usage, sidebar contrast fix, and TopBar breadcrumbs + spacing. | Milestone 5 | DONE |
| 7 | **Card Redesign & Action Portal Extraction** | Add Card border/padding/glassmorphism/keyboard/hover updates, SegmentedControl and HeaderActionPortal integration. | Milestone 6 | DONE |
| 8 | **Finance Home Streamlining** | Streamline Finance Home page: remove Recent Activity and Accounts, reorder Insight cards below KPIs, and hide by default with toggles in HeaderActionPortal. | Milestone 7 | DONE |
| 9 | **Card Standardization** | Audit, update, and standardize all pages and tabs to use Card/GlassCard with icons, subtitles, and header actions (filters/legends). | Milestone 8 | IN_PROGRESS |



## Interface Contracts
- **`aiosTheme.ts`**: Theme tokens for light and dark themes. Exported keys: `aiosLightTheme`, `aiosDarkTheme`.
- **`PageTransition.tsx`**: Wrapper for route transitions.
- **`AreaTabs.tsx`**: Standardized tab headers.

## Code Layout
- `frontend/src/theme/aiosTheme.ts` — Global theme tokens.
- `frontend/src/pages/` — Page components (Dashboard, Chat, Settings, etc.).
- `frontend/src/pages/areas/` — Domain area pages (Finance, Health, Career, Business, Content).
- `frontend/src/components/layout/` — Shell elements (AppShell, Sidebar, TopBar, BottomNav).
- `frontend/src/components/ui/` — Base ui primitives.

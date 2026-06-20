# Execution Plan: AIOS UI/UX Polish, Accessibility, and Responsive Enhancement

## Target Requirements

### R1. Audit and Fix All Visual Inconsistencies
- Audit `DashboardPage`, `LoginPage`, `ChatPage`, `AgentsPage`, `SettingsPage`, `IntegrationsPage`, and all five area pages (Finance, Health, Career, Business, Content).
- Replace hardcoded hex colors, shadows, fonts with `theme.color.*` or `theme.shadow.*` tokens from `aiosTheme.ts`.
- Ensure all body typography uses `DM Sans` (sans-serif) and display headings use `Playfair Display` (serif).

### R2. Fix Accessibility and UX Interaction Bugs
- Ensure `cursor: pointer` on hover for buttons, links, tabs, cards, inputs, dropdowns.
- Add smooth hover/active transitions (150–300ms) on interactive elements.
- Visible focus rings using `#CA8A04` via Tailwind/theme tokens for keyboard navigation.
- Fix z-index conflicts (Sidebar, Modals, Toasts, Command Palette).
- Associate `<label>` elements or `aria-label` attributes for all form inputs.
- Add skeleton loadings or spinners for async fetches.

### R3. Elevate to Award-Worthy Polish
- **KPI cards on Dashboard:** Add count-up number animation on mount.
- **Page transitions:** Smooth fade/slide transitions between routes (via `PageTransition.tsx`).
- **Sidebar active states:** Active navigation item with clear gold `#CA8A04` accent.
- **Empty states:** Check all `EmptyState` components have an icon, headline, and clear CTA.
- **Bento grid layout on Dashboard:** Asymmetric grid layout for Dashboard KPIs.
- **Micro-interactions:** Add `hover:scale-[1.02] transition-transform duration-200` to clickable cards.
- **TopBar backdrop:** Glassmorphism (`backdrop-blur`) / subtle shadow.

### R4. Responsive Layout Verification
- Mobile (375px): Sidebar hidden, BottomNav visible, no horizontal scroll.
- Tablet (768px): Sidebar collapsible/icon-only.
- Desktop (1440px): Sidebar + content, no overflows.

### R5. Verify and Maintain Build Integrity
- Compile cleanly via `pnpm build` in `frontend/`. Zero TS/lint errors.

---

## Decomposed Milestones

| # | Milestone Name | Scope | Verification Criteria | Status |
|---|---|---|---|---|
| 1 | **Codebase Exploration & Analysis** | Audit the frontend files to locate visual inconsistencies, missing focus/hover styles, empty states, and layout issues. | Audit report generated. | PLANNED |
| 2 | **Visual & Accessibility Fixes (R1 & R2)** | Fix hardcoded colors/fonts/shadows, add cursor-pointer, transitions, focus rings, form labels, and skeleton states. | Clean audit report, verification checks pass. | PLANNED |
| 3 | **Premium UI/UX Polish (R3)** | Implement Dashboard Bento grid, count-up animations, page transitions, Sidebar accent, glassmorphic TopBar, and card hover effects. | Premium design requirements satisfied. | PLANNED |
| 4 | **Responsive Layout & Build Verification (R4 & R5)** | Verify responsive layout at 375px/768px/1440px and verify build via `pnpm build` output. | `pnpm build` passes with zero warnings/errors. Responsive rules satisfied. | PLANNED |
| 5 | **Forensic Audit & Integrity Gate** | Perform independent static analysis and check for mock/hardcoded implementations. | Milestone 4 verified. | DONE |
| 6 | **Resolve Follow-up UI/UX Issues (R1-R4)** | Implement unified toolbar & pinned actions, strict card/table wrapper usage, sidebar contrast fix, and TopBar breadcrumbs + spacing. | Verify all acceptance criteria for follow-up issues are met and build compiles cleanly. | PLANNED |

---

## Orchestration Details

- **Pattern**: Explorer → Worker → Reviewer → Challenger → Forensic Auditor.
- **Verification Strategy**:
  - Spawn specialized subagents to analyze and implement changes.
  - Spawn Reviewer to review code changes.
  - Spawn Challenger to verify correctness.
  - Spawn Auditor to verify build integrity and ensure no cheat implementations.

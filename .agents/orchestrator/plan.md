# Refactoring Plan: Card Redesign, Tab Toolbar Extraction, and Card Action Repositioning

## Target Requirements

Based on the latest user follow-up request (2026-06-20T14:20:08Z):

### R1. Complete Toolbar Extraction
Identify all remaining tabs (`BodySleepTab`, `FitnessTab`, `NutritionTab`, and `OpportunitiesTab`) that render a `TabToolbar` or a custom `Toolbar` with action buttons. Move these action buttons into the `<HeaderActionPortal>` from `@ledgr/ui`. Delete the redundant `TabToolbar` component.

### R2. Global Card Redesign
Update the `Card` component in `@ledgr/ui` globally to match the new design:
- Add a bottom border below the `CardHeader`.
- Reduce the padding at the bottom of the card universally.
- Incorporate premium design touches from the `/ui-ux-pro-max` guidelines (subtle hover scale, gold border highlight, and clean layout transitions).

### R3. Reposition Card Actions
Pass the segmented controls and legends of the `WalletWidgets` "Net Worth Trend" card into the `action` slot of the Card component.

---

## Decomposed Milestones

| # | Milestone Name | Scope | Verification Criteria | Status |
|---|---|---|---|---|
| 1 | **Exploration & Strategy** | Audit `Card.tsx`, `TabToolbar.tsx`, `OpportunitiesTab.tsx`, `BodySleepTab.tsx`, `FitnessTab.tsx`, `NutritionTab.tsx`, and `WalletWidgets.tsx`. | Explorer handoff report confirming code locations and implementation details. | PLANNED |
| 2 | **Component Refactoring** | Implement Card bottom border, bottom padding reductions, premium hover states. Relocate action buttons in the four target tabs to `HeaderActionPortal`. Reposition "Net Worth Trend" tabs to the `action` prop of `Card`. Delete `TabToolbar.tsx` file. | Worker handoff confirming implementation and compile checks. | PLANNED |
| 3 | **Verification & Audit** | Run build compilation check `pnpm build` in `frontend/` directory, execute reviewer checks for visuals/layout, and perform Forensic Integrity Audit. | Build compiles with 0 errors, Auditor passes with CLEAN verdict. | PLANNED |

---

## Orchestration Details
- **Pattern**: direct iteration loop (Explorer -> Worker -> Reviewer -> Challenger/Auditor).
- **Integrity Mode**: demo.
- **Verification Strategy**:
  - Run build command `pnpm build` under the `frontend` directory to ensure build integrity.
  - Review rendering of cards, actions, and tabs.
  - Ensure `TabToolbar` imports are entirely removed and the file is deleted.

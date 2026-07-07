# Lessons Learned

This document serves as a growing knowledge base of mistakes made during development and their corresponding corrections. Before making similar changes, always refer to this file to prevent regressions and improve consistency.

## UI & Layout Consistency

- **Issue:** The `ProjectsPage`, `SprintsPage`, and `TasksPage` were using the global `@ledgr/ui` `PageHeader` component, but they didn't match the other domain pages because they were missing the `icon` and `eyebrow` properties, and lacked a bottom border.
  **Correction:** Always provide an `icon` and `eyebrow` prop to `PageHeader` for consistency across domain pages. When a page has no tabs, ensure a `<PageDivider />` is placed immediately after the `PageHeader` to maintain the global bottom border aesthetic. (Added 2026-07-06)

- **Issue:** The `ReviewPage` had a custom hardcoded padding and max-width layout container that caused its main content area to misalign with the global padding and margins.
  **Correction:** Never roll custom layout wrappers for the main page body. Always use the global `<PageContainer>` and `<PageContent>` layout components from `@/components/layout/PageLayout`. If a specific width constraint is needed (like a narrow reading view), apply it to an inner container *inside* `<PageContent>`. (Added 2026-07-06)

- **Issue:** The `DomainGoalsCard` was rendered independently on `HealthPage`, `CareerPage`, `BusinessPage`, and `Content` overview tab, creating redundant widgets and clutter.
  **Correction:** Consolidated `DomainGoalsCard` instances directly into the `GoalsPage` tabs. To maintain a clean dashboard, ensure macro-goal tracking is centralized in the Goals area rather than injecting standalone goal cards into each individual domain. (Added 2026-07-06)

## State & Form Components

- **Issue:** Components used for creating new entities (like Projects, Sprints, and Tasks) lacked the ability to edit existing records because they didn't receive or populate the initial data.
  **Correction:** Unify "Create" and "Edit" modals into a single dynamic Dialog. Ensure the Dialog's `useEffect` explicitly hooks onto `[open, editingEntity]` to properly prefill form state when editing, and explicitly reset form state when closing or opening a new creation flow. (Added 2026-07-06)

## Styling & API Contract Adherence

- **Issue:** Leftover Tailwind CSS utility classes (such as `mb-4` or `animate-spin`) remained after purging Tailwind, causing static animations and missing spacing since Tailwind classes do not render.
  **Correction:** Always replace Tailwind utility classes with custom styled-components or `@ledgr/ui` theme token mappings. Ensure spinners use standard keyframe rotations or standard spinner components. (Added 2026-07-07)

- **Issue:** Contradictory E2E test assertions caused failures on unimplemented REST routes (e.g. DELETE/PATCH tests asserting on random UUIDs vs expecting 404 for nonexistent resources).
  **Correction:** Ensure E2E tests are logically sound: creation tests should verify 201, while subsequent edit/delete tests should first create a resource, get its actual ID, and run the updates against that specific ID. Ensure backend routers and test targets align on prefix paths (such as `/api/quotes` vs `/api/quotes/save`). (Added 2026-07-07)

- **Issue:** Single actions (like "Add Transaction") were wrapped in `AreaToolbar` components or placed arbitrarily.
  **Correction:** Updated Action Placement Guidelines:
  - Use `AreaToolbar` ONLY if there are multiple elements (e.g. multiple buttons, filters, search).
  - If there is only ONE button for a tab:
    - If the tab's main content is a single Card, place the button on the right side of the Card's header (parallel to the card's title).
    - Otherwise, elevate the single button to the global `PageHeader` (aligned right, parallel to the page title) using the `HeaderActionPortal`. (Added 2026-07-07)

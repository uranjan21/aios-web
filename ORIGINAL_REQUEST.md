# Original User Request

## Initial Request — 2026-07-06T21:39:33Z

Audit, fix, and enhance the AIOS Web platform's UI/UX, frontend, backend, and data consistency across 8 specific features including workspace domain syncing, layouts, quotes functionality, and dashboard grid.

Working directory: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web
Integrity mode: development

## Requirements

### R1. Domain Syncing for Workspace Entities
- Update the create/edit forms for Projects, Sprints, and Tasks so that if a specific domain (e.g., 'finance') is selected, the "Linked Goal" dropdown is filtered to only show goals belonging to that domain.
- Add tabs and table views to Projects, Sprints, and Tasks pages to match the Goals page structure.

### R2. PageHeader Description Alignment
- Modify the global `@ledgr/ui` `PageHeader` component so the subtitle/description appears directly below the main title rather than floating parallel/inline with it.

### R3. Content Page UI Consistency
- Audit the Content page tabs (Campaigns, etc.) and update them to ensure they use the standard `PageContainer`, `PageContent`, `AreaTabs`, and global padding/margins like other domain pages.

### R4. Collapsible Workspace Sections
- In Projects, Sprints, and Tasks pages, ensure that grouped sections (e.g., by domain or sprint) are collapsible (expand/collapse functionality).

### R5. Dashboard Layout Optimization
- On the Dashboard Page desktop view, move the Life Heatmap to the left column (Main) and ensure the Calendar has enough space in the right rail to prevent squeezing.

### R6. Interactive Saved Quotes Feature
- Implement a backend table for `saved_quotes`.
- Update the Dashboard quote component to include a "Refresh" icon (fetches a new quote) and a "Heart/Save" icon (saves to DB).
- For now, quotes just need to be saved to the database (a viewer UI is not required yet).

### R7. Contextual Quick Capture Button
- Update the Quick Capture (⌘L) or FAB button to default to "Add Task" for the current project/sprint if viewing one, otherwise fallback to the Global Capture (⌘L) modal.

## Acceptance Criteria

### Verification
- [ ] End-to-end programmatic tests pass (`pytest` in backend, `tsc` and `build` in frontend).
- [ ] Manual verification via UI walkthrough: The PageHeader subtitle is stacked vertically below the title across the app.
- [ ] Manual verification: Adding a Project in 'Finance' only shows Finance goals.
- [ ] Manual verification: Quotes can be saved to the database and persist after page reload.
- [ ] Manual verification: Dashboard desktop layout does not squeeze the calendar.

## Follow-up — 2026-07-07T00:46:03+05:30

Conduct a comprehensive UI/UX, design, and frontend audit of the aios-web application. You will directly implement fixes as you discover them across all pages, tabs, components, logic, and state management.

Working directory: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web
Integrity mode: development

## Requirements

### R1. UI/UX Audit and Design Generation
Use the `ui-ux-pro-max` search script to generate professional design recommendations and a cohesive design system for the app (e.g. SaaS, dashboard). Apply these guidelines during your audit.

### R2. Direct Implementation of Fixes
Directly implement design improvements, layout fixes, and accessibility enhancements across the frontend codebase as they are identified.

### R3. Component Logic & State Refactoring
Analyze React components for poor state management or structural issues and refactor them to improve performance, maintainability, and data flow.

### R4. Strict Styling Adherence
Strictly use `styled-components` and the `@ledgr/ui` theme tokens for all styling. Ensure absolutely no Tailwind CSS utility classes are used or introduced.

## Acceptance Criteria

### Execution & Implementation
- [ ] The `ui-ux-pro-max` script is executed with appropriate keywords to generate a comprehensive design system.
- [ ] Tailwind CSS is completely absent from all implemented or refactored styling.
- [ ] All new or modified styling strictly uses `styled-components` and `@ledgr/ui` tokens.
- [ ] The web app successfully compiles and builds (e.g., `npm run build` or `npm run type-check`) without type or syntax errors after all fixes are applied.
- [ ] Significant logic or state management refactors are documented in an audit report artifact alongside the code changes.

## Follow-up — 2026-07-07T03:19:06Z

# Teamwork Project Prompt — Draft

Conduct a comprehensive UI/UX refactor to enforce the new `AreaToolbar` button placement rules. Audit all tabs and pages, and reposition any single buttons according to the new design logic.

Working directory: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web
Integrity mode: development

## Requirements

### R1. AreaToolbar Pruning
Analyze every instance of `AreaToolbar` in the frontend codebase. If an `AreaToolbar` contains only a single element (e.g., a single "Add X" button), remove the `AreaToolbar` entirely and reposition the element.

### R2. Single Card Placement
If the tab contains only a single `Card` component for its main content, place the isolated button inside the right side of the `Card`'s header (parallel to the card's title).

### R3. Global PageHeader Placement
If the tab does not use a single `Card` (e.g., complex grid, lists, or multiple cards), use the `<HeaderActionPortal>` component to teleport the isolated button up to the global `PageHeader`'s action slot (parallel to the page title, aligned right).

### R4. Preserve Multi-Element Toolbars
If an `AreaToolbar` contains multiple elements (e.g., a view switcher and a button, or filters), leave the `AreaToolbar` as is.

## Acceptance Criteria

### Execution & Implementation
- [ ] No `AreaToolbar` component in the codebase contains only a single interactive element.
- [ ] Isolated buttons on single-card tabs are properly rendered in the right side of the card header.
- [ ] Isolated buttons on complex tabs successfully appear in the global `PageHeader` using `HeaderActionPortal`.
- [ ] The frontend compiles and builds successfully (e.g., `npm run build` or `npm run type-check`) with no errors.
- [ ] All 82 E2E tests still pass, ensuring no functional button flows were broken.

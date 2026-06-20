# Handoff Report: Card/GlassCard Usages Audit

## 1. Observation
We have systematically audited the target general pages and layout components in `aios-web` to check their compliance with the standard Card layout conventions (requiring an icon, title, a 1-line subtitle, and action/filter placements in the `action` prop). 

Below are the exact observations from the codebase:

*   **`frontend/src/pages/DashboardPage.tsx`**:
    *   `SummaryCard` (Lines 305–308) and `AreaTile` (Lines 365–368) build custom header components within the card body instead of utilizing the standard `title`, `subtitle`, and `icon` props. For example:
        ```tsx
        305:       <SummaryCardHeader>
        306:         <IconBadge icon={Icon} color={color} size="sm" />
        307:         <SummaryCardTitle>{title}</SummaryCardTitle>
        308:       </SummaryCardHeader>
        ```
    *   No subtitles are provided for the KPI tiles (Finance, Health, Agents) or Area tiles (Career, Business, Content).
    *   There are no action filters present on any of these cards.
    *   Quick Capture (Lines 542–551) uses `@ledgr/ui` `GlassCard` with correct `title`, `subtitle`, and `icon` props, but has no `action` filters.
*   **`frontend/src/pages/LoginPage.tsx`**:
    *   `LoginCard` (Lines 232–242) is a custom styled form element instead of `@ledgr/ui` `Card` or `GlassCard`. It lacks an icon, subtitle, or standard action elements:
        ```tsx
        232: const LoginCard = styled.form`
        233:   background: ${({ theme }) => theme.color.card};
        234:   border: 1px solid ${({ theme }) => theme.color.border};
        235:   border-radius: ${({ theme }) => theme.radii.xl};
        ```
*   **`frontend/src/pages/ChatPage.tsx`**:
    *   No Card/GlassCard usages or custom card wrappers are used for layout tiles.
*   **`frontend/src/pages/AgentsPage.tsx`**:
    *   `AgentCard` (Lines 297–361) utilizes `AgentCardWrapper` (extending `AppCard` / `@ledgr/ui` `Card`) with `title`, `subtitle`, `icon` props. It correctly positions status indicators, switches, and buttons inside the `action` prop. **100% Compliant**.
*   **`frontend/src/pages/SettingsPage.tsx`**:
    *   Uses `@ledgr/ui` `GlassCard` correctly inside the `Section` wrapper (Line 73) and the Account card (Line 459) to set `title`, `subtitle`, and `icon`. 
    *   No action controls/filters are currently passed into the `action` prop.
*   **`frontend/src/pages/IntegrationsPage.tsx`**:
    *   `IntegrationCard` (Line 164) uses `GlassCard` with proper `title`, `subtitle`, and `icon`. It correctly places the status indicator inside the `action` prop.
*   **`frontend/src/components/layout/WorkspaceLayout.tsx`**:
    *   The `Rail` component (Line 17) uses a custom styled `div` container styled to look like a card with border, background, and shadows, but lacks standard headers.

---

## 2. Logic Chain
Our reasoning from observations to recommended refactoring follows a step-by-step logic chain based on the design rules:

1.  **Rule**: Cards must have an icon, title, and a 1-line faded subtitle. 
    *   *Step*: `DashboardPage`'s `SummaryCard` and `AreaTile` lack subtitles and define custom header markup instead of using `Card` props.
    *   *Conclusion*: They must be refactored to pass `icon`, `title`, and a descriptive `subtitle` prop directly into `AppCard`/`GlassCard`.
2.  **Rule**: Filters/actions (dropdowns, selectors, etc.) must be placed in the `action` prop of Card/GlassCard.
    *   *Step*: Cards in `DashboardPage` and `SettingsPage` currently have no action/filter controls.
    *   *Conclusion*: We must suggest relevant context filters (e.g. date-range selection, toggle filters, or quick action buttons like "Reset Theme" or "Sign out") to be rendered via the `action` prop.
3.  **Rule**: Visual container tiles (like login container or rails) that mimic cards should use the `@ledgr/ui` standard elements.
    *   *Step*: `LoginPage`'s `LoginCard` and `WorkspaceLayout`'s `Rail` use custom styled divs.
    *   *Conclusion*: Replacing them with standard `Card` or `GlassCard` elements ensures visual consistency across the entire app workspace.

---

## 3. Caveats
*   We focused only on pages outside of the `pages/areas/` folder and layout components in `components/layout/` as instructed.
*   We assumed that custom styling applied to wrappers like `SummaryCardWrapper` or `AreaTileWrapper` can be safely mapped to the standard properties of the underlying `@ledgr/ui` `Card` without visual breakage.
*   No other layout pages (like custom areas or detail pages) were audited.

---

## 4. Conclusion
*   **Highly Compliant Components**: `AgentsPage.tsx` is completely compliant and serves as the reference implementation. `IntegrationsPage.tsx` is mostly compliant.
*   **Non-Compliant Custom Layouts**: `LoginPage.tsx` (`LoginCard`) and `WorkspaceLayout.tsx` (`Rail`) use custom styled wrappers and should be refactored to `@ledgr/ui` components.
*   **Refactoring Needed**: `DashboardPage.tsx` cards (`SummaryCard`, `AreaTile`) must be refactored to drop custom header elements in favor of standard `icon`, `subtitle` and `action` props.
*   **Action Filters Suggestions**: Added suggestions for time/period, status, and control filters for `DashboardPage` and `SettingsPage` to be placed inside the `action` prop.

---

## 5. Verification Method
To verify compliance:
1.  **Visual Code Inspection**: Inspect the codebase of `DashboardPage.tsx`, `LoginPage.tsx`, `SettingsPage.tsx`, and `WorkspaceLayout.tsx` to verify that all card elements receive standard props: `title`, `subtitle`, `icon`, and `action`.
2.  **Static Types Validation**: Build the frontend directory using `pnpm build` (or `npm run build`) in `frontend/` to ensure the new props passed to `Card`/`GlassCard` are type-safe and compile successfully.
3.  **Visual Proofing**: Check that page-level action filters render in the top-right corner of the cards and align with design mockups.

# Handoff Report: Accessibility & UI/UX Audit

## 1. Observation
Direct observations of target source code files:
*   **`frontend/src/components/layout/TopBar.tsx`:**
    *   **Global Search Input** (Lines 310-314) lacks `aria-label` or label association:
        ```tsx
        <input 
          type="text" 
          placeholder="Search anything (⌘K)..." 
          readOnly 
        />
        ```
    *   **Interactive Menu Buttons** (Lines 24-58, 156-182) like `Hamburger`, `BackButton`, `IconButton` lack `:focus` or `:focus-visible` styles using the `theme.color.ring` token.
*   **`frontend/src/pages/SettingsPage.tsx`:**
    *   **Select components** (Lines 470-480, 492-503) lack `aria-label` or labeling:
        ```tsx
        <Select
          size="sm"
          fullWidth={false}
          options={[...]}
          value={aiRange}
          onChange={(val) => setAiRange(val as string)}
        />
        ```
    *   **GlassCard components** (Lines 76-88, 422-518) do not pass `variant="glass"`, defaulting to opaque style.
*   **`frontend/src/components/dashboard/MonthlyCalendar.tsx`:**
    *   **Category Select** (Lines 434-442) has an orphaned label (`htmlFor="evt-category"`) because the `Select` lacks the corresponding `id`:
        ```tsx
        <Label htmlFor="evt-category">Category</Label>
        <Select
          fullWidth
          options={CATEGORIES}
          ...
        />
        ```
*   **`frontend/src/components/dashboard/OverviewInsightCard.tsx`:**
    *   Hardcodes custom header layout (`HeaderRow`, lines 705-727) inside the card body rather than using the parent `<Card>` props (`title`, `subtitle`, `icon`, `action`). It also lacks a 1-line subtitle.
*   **`frontend/src/components/layout/BottomNav.tsx`:**
    *   **`TabLink`** navigation links (Lines 22-34) lack `focus` or `focus-visible` styles.

---

## 2. Logic Chain
1.  **Orphaned Labels and Missing Accessible Names:**
    *   *Step 1:* Input elements without linked label elements or `aria-label` properties (observed in `TopBar.tsx` search, `SettingsPage.tsx` select dropdowns) cannot be announced correctly by screen readers, violating WCAG 2.1 Criterion 4.1.2 (Name, Role, Value).
    *   *Step 2:* The category label in `MonthlyCalendar.tsx` references `evt-category` via `htmlFor`, but because the corresponding `<Select>` element does not expose a matching `id`, the label remains orphaned, violating WCAG 2.1 Criterion 1.3.1 (Info and Relationships).
2.  **Focus Indicators and Transitions:**
    *   *Step 1:* Multiple interactive elements (observed in `TopBar` buttons, `BottomNav` links, and the recent activity action) lack custom focus outlines. Although the project theme correctly defines `theme.color.ring` as the `#CA8A04` gold accent, these components fail to style the `focus-visible` state, violating WCAG 2.1 Criterion 2.4.7 (Focus Visible).
3.  **Visual Styling Consistency:**
    *   *Step 1:* Cards in the `SettingsPage` are imported under the alias `GlassCard` but omit the `variant="glass"` prop, violating the design system guideline for frosted glass backdrops.
    *   *Step 2:* `OverviewInsightCard` constructs its own custom header row manually rather than passing values to the `Card` component's `title`, `subtitle`, `icon`, and `action` props, violating the layout guidelines in `AGENTS.md` for standardized card headers.

---

## 3. Caveats
*   Live screen reader verification was not performed (read-only investigation).
*   Browser-specific differences in focus outlines (e.g. Safari vs. Chrome defaults) must be validated after implementing the styles.

---

## 4. Conclusion
The application contains several distinct accessibility violations (missing/orphaned labels and missing focus-visible indicators) and visual design deviations (opaque sections in Settings and non-standard card headers on the Dashboard).
These issues are fully resolvable by:
1.  Assigning correct `id` and `aria-label` props to the inputs and selects.
2.  Styling focus rings using `theme.color.ring` (resolves to `#CA8A04` gold) on all buttons and nav links.
3.  Passing `variant="glass"` to settings cards and bottom nav bar.
4.  Refactoring `OverviewInsightCard` to use standard Card props and add a 1-line subtitle.

---

## 5. Verification Method
Verify the fixes in the codebase by checking that:
1.  The `<Select>` in `MonthlyCalendar.tsx` contains `id="evt-category"`.
2.  The `<input>` in `TopBar.tsx` global search contains `aria-label="Global search"`.
3.  Interactive styled elements in `TopBar.tsx`, `BottomNav.tsx`, and `SettingsPage.tsx` contain `&:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }` rules.
4.  Settings page sections pass `variant="glass"`.
5.  `OverviewInsightCard` uses `Card` title/subtitle/icon/action props.

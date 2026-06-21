# EX1 FINDINGS: Accessibility & UI/UX Audit Report

## 1. Summary of Findings
An accessibility and UI/UX audit of the core application pages (`LoginPage`, `SettingsPage`, `DashboardPage`) and shell elements (`TopBar`, `Sidebar`, `BottomNav`) was conducted against the project's agent guidelines, `a11y-debugging` principles, and `ui-ux-pro-max` standards. The audit revealed multiple critical accessibility violations—such as orphaned form labels, missing accessible names on inputs/selects, and absent focus-visible rings—alongside several visual consistency issues, including the lack of frosted glass card variants and deviations from the standardized card header guidelines.

---

## 2. Accessibility (a11y) Gaps

### A. Missing `aria-label` or Associated Labels
*   **Global Search Input (`TopBar.tsx`):**
    The global search bar input lacks any associated `<label>`, `id`, or `aria-label`. It only has a `placeholder`.
    *Snippet (Lines 310-314):*
    ```tsx
    <input 
      type="text" 
      placeholder="Search anything (⌘K)..." 
      readOnly 
    />
    ```
    *Proposed Fix:* Add `aria-label="Global search"` or link it to a hidden label.

*   **Settings Page Select Dropdowns (`SettingsPage.tsx`):**
    The dropdowns for **AI Usage** (time range) and **Keyboard Shortcuts** (category filters) have no associated label or `aria-label` prop.
    *Snippet (Lines 470-480):*
    ```tsx
    <Select
      size="sm"
      fullWidth={false}
      options={[
        { label: 'Daily', value: 'daily' },
        ...
      ]}
      value={aiRange}
      onChange={(val) => setAiRange(val as string)}
    />
    ```
    *Proposed Fix:* Pass `aria-label="AI usage period"` and `aria-label="Keyboard shortcut category"`.

*   **User Menu Trigger (`TopBar.tsx`):**
    The profile trigger button contains only static user details and avatar initials ("U") but lacks an `aria-label` or description indicating its role as a user dropdown menu.
    *Snippet (Lines 325-331):*
    ```tsx
    <UserMenuTrigger>
      <div className="avatar">U</div>
      ...
    </UserMenuTrigger>
    ```
    *Proposed Fix:* Add `aria-label="User settings menu"`.

### B. Orphaned Form Labels (Calendar Event Dialog)
*   **Category Select (`MonthlyCalendar.tsx`):**
    The dialog has a `<Label htmlFor="evt-category">Category</Label>`, but the corresponding `<Select>` component does not have `id="evt-category"`. As a result, the label is orphaned, and screen readers cannot link it to the dropdown.
    *Snippet (Lines 433-442):*
    ```tsx
    <Label htmlFor="evt-category">Category</Label>
    <Select
      fullWidth
      options={CATEGORIES}
      ...
    />
    ```
    *Proposed Fix:* Add `id="evt-category"` to the `<Select>` props (supported by the component).

### C. Missing Navigation Landmarks
*   **Sidebar and BottomNav Landmarks:**
    Both the `Sidebar` and `BottomNav` define `<nav>` containers, but neither provides an `aria-label` to distinguish between the desktop and mobile navigation contexts.
    *Proposed Fix:* Add `aria-label="Main navigation"` to Sidebar's nav and `aria-label="Mobile navigation"` to BottomNav.

---

## 3. Interactive Elements, Focus Rings, and Transitions

The project theme uses `#CA8A04` as the gold accent ring color. However, multiple interactive elements either lack focus styles completely or miss transition values.

### A. Missing Focus Rings (`focus-visible`)
*   **TopBar Buttons (`TopBar.tsx`):**
    The `Hamburger` menu button, `BackButton`, `IconButton` (theme toggle), and `UserMenuTrigger` do not define focus rings (`focus-visible`). They fall back to default browser focus behavior.
*   **Bottom Navigation Tabs (`BottomNav.tsx`):**
    The `TabLink` navigation links lack any focus outlines or rings.
*   **Recent Activity Button (`RelevantCards.tsx`):**
    The "View all →" button lacks focus-visible styles.

### B. Missing Transitions on Hover
*   **Retry Status Button (`SettingsPage.tsx`):**
    The `RetryBtn` has hover styles but lacks a CSS transition, resulting in instantaneous visual changes.
*   **Sidebar Toggle Button (`Sidebar.tsx`):**
    The `ToggleButton` lacks background-color transitions when hovered.
*   **Recent Activity Actions (`RelevantCards.tsx`):**
    The "View all →" button lacks color transitions.

---

## 4. Visual & Styling Gaps (Frosted Glass & Borders)

*   **Opaque Settings Cards:**
    `SettingsPage.tsx` imports the card component as `GlassCard` (lines 13, 76-88), but fails to pass `variant="glass"`. Consequently, all settings sections default to the opaque white/dark-gray look.
*   **Dashboard and Login Cards:**
    None of the cards in `DashboardPage.tsx` or the main card in `LoginPage.tsx` utilize `variant="glass"`.
*   **BottomNav Background:**
    `BottomNav.tsx` uses the opaque `theme.color.card` with no frosted glass (`backdrop-filter`) style.
    *Proposed Style:*
    ```css
    background: color-mix(in srgb, ${({ theme }) => theme.color.card} 80%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    ```

---

## 5. AGENTS.md Layout & Card Header Violations

The guidelines in `AGENTS.md` require all cards, KPI tiles, and charts to have:
1. An icon.
2. A 1-line faded subtitle.
3. Relevant action items parallel to the header.
4. Using the standard `icon`, `subtitle`, and `action` props on `Card`/`GlassCard`.

### Gaps Found:
1.  **`OverviewInsightCard.tsx` (Critical Violation):**
    *   It **hardcodes** a custom header layout (`HeaderRow`) inside the card body rather than passing props to the parent `<Card>`.
    *   It **lacks a subtitle** entirely.
2.  **`UnifiedSchedulePanel.tsx`:**
    *   Lacks `icon`, `subtitle`, and `action` props.
3.  **Dashboard Cards (`RelevantCards.tsx`):**
    *   `HabitsCard`, `WeekActivityCard`, `FocusCard`, and `DomainPulseCard` do not specify any actions or parallel controls, though they have subtitles and icons.

---

## 6. Detailed Audit Table by File

| File Path | Element | Category | Finding | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `LoginPage.tsx` | Page Layout | UI/UX | Responsive styling | Correctly hides hero panel on mobile (`<1024px`). |
| `LoginPage.tsx` | inputs | a11y | Labeled inputs | Email and password inputs are properly linked to labels. |
| `SettingsPage.tsx` | `Select` (AI Usage) | a11y | Missing accessible name | No `aria-label` or visible label associated. |
| `SettingsPage.tsx` | `Select` (Shortcuts) | a11y | Missing accessible name | No `aria-label` or visible label associated. |
| `SettingsPage.tsx` | `GlassCard` (Sections) | UI/UX | Missing glass variant | Didn't pass `variant="glass"`; renders opaque card. |
| `SettingsPage.tsx` | `RetryBtn` | UI/UX | Missing transition | No hover color transition. |
| `TopBar.tsx` | Hamburger, Back, Theme Toggle | a11y/UI | Missing focus indicators | Lack `focus-visible` styling with `#CA8A04`. |
| `TopBar.tsx` | Global Search Input | a11y | Missing accessible name | Input has no `<label>` or `aria-label` attributes. |
| `TopBar.tsx` | HeaderRoot | UI/UX | Glass styling | Correctly uses frosted glass style and border tokens. |
| `BottomNav.tsx` | `TabLink` | UI/UX | Missing focus rings | Lack focus indicator styling entirely. |
| `BottomNav.tsx` | `Nav` | UI/UX | Missing glass styling | Opaque background without backdrop blur. |
| `MonthlyCalendar.tsx` | Category `Select` | a11y | Orphaned label | Label has `htmlFor="evt-category"` but select has no `id`. |
| `OverviewInsightCard.tsx` | `Card` | UI/UX | Custom header layout | Hardcoded header inside card; violates `AGENTS.md` guidelines. |
| `OverviewInsightCard.tsx` | `SegBtn` | a11y | Missing accessibility | Lacks `role="tab"` or `aria-selected` state indicator. |

---

## 7. Proposed Code Fixes (Snippets)

### A. Fixing the Category Select ID in `MonthlyCalendar.tsx`
```tsx
// Before (Line 434)
<Select
  fullWidth
  options={CATEGORIES}
  value={draft.category || "personal"}
  onChange={(v) =>
    setDraft((d) => ({ ...d, category: v as EventCategory }))
  }
/>

// After
<Select
  fullWidth
  id="evt-category" // Link to the label
  options={CATEGORIES}
  value={draft.category || "personal"}
  onChange={(v) =>
    setDraft((d) => ({ ...d, category: v as EventCategory }))
  }
/>
```

### B. Adding Focus Rings to TopBar Buttons in `TopBar.tsx`
```tsx
// Before (Line 156)
const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 12px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background-color 120ms, color 120ms;
  
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`

// After
const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 12px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background-color 120ms, color 120ms;
  
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }
  
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`
```

### C. Standardizing Card Headers in `OverviewInsightCard.tsx`
```tsx
// Before (Lines 703-727)
return (
  <Card size="lg" variant="default">
    <HeaderRow>
      ...
    </HeaderRow>
    {/* Content... */}
  </Card>
);

// After
return (
  <Card 
    size="lg" 
    variant="glass" // Frosted glass backdrop
    title={mode === "overview" ? "Life Overview" : "Daily Brief"}
    subtitle="AI-synthesised daily status across your logs" // Added 1-line subtitle
    icon={<Sparkles size={14} style={{ color: "#CA8A04" }} />}
    action={
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <SegControl>
          <SegIndicator $mode={mode} />
          <SegBtn $active={mode === "overview"} onClick={() => setMode("overview")}>
            <Sparkles size={11} /> Overview
          </SegBtn>
          <SegBtn $active={mode === "brief"} onClick={() => setMode("brief")}>
            <BookOpen size={11} /> Daily Brief
          </SegBtn>
        </SegControl>
        {actionBtn}
      </div>
    }
  >
    {/* Content... */}
  </Card>
);
```

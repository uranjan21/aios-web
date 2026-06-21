# Card Layouts and Responsiveness Analysis

This report documents the verification, responsiveness, z-index, and spacing checks performed on the standardized Card layouts.

## 1. Visual Alignment of Headers and Actions

The standardized `Card` / `GlassCard` layout implements the following CSS styling for its header:
```css
export const CardHeader = styled.div<{ $inset?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  padding-bottom: 12px;
  margin-bottom: 16px;
  ...
`;
```
- **Alignment**: The `flex` container with `justify-content: space-between` ensures the `TitleGroup` (Icon, Title, Subtitle) is positioned on the left, while any actions (e.g. Select dropdowns, badges, segmented controls) are aligned to the **top-right** and vertically centered relative to the header.
- **Select Sizing**: The `Select` component now accepts a `style` prop that is passed to the trigger element, allowing for exact width constraints (e.g., `style={{ width: '90px' }}` in `TwitterQueueCard.tsx`).
- **Type Coercion**: The `Select` component was updated to compare option values as strings: `String(o.value) === String(current)`. This avoids selection mismatches (e.g. for numbers like `2026` vs `'2026'`) which could break header action displays.

## 2. Responsiveness and Overflow Checks

- **Overflow Clipping**: The root `StyledCard` component contains `overflow: hidden;`. This correctly clips child components (such as graphs or list views) within the card's rounded borders (`border-radius: 12px`).
- **Wide Tables**: Tables migrated to use `DataTable` (e.g., the health logs history table in `HistoryTab.tsx`) inherit a `.ScrollArea` container with `overflow-x: auto;`. This enables horizontal scrolling within the card on narrow devices, protecting the parent shell layout from horizontal breakage.
- **Form Layouts**: In the new `AccountManager.tsx` Edit Account Dialog, the `FormGrid` uses CSS Grid:
  ```css
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
  ```
  This behaves responsively:
  - On screens `> 480px`, it renders in two columns.
  - On screens `<= 480px`, it collapses to one column.
  - Fields wrapped in `FullWidth` (`grid-column: 1 / -1`) scale gracefully.
- **Metrics Layout**: `BusinessPage.tsx` uses a 12-column grid system where `MetricCard` spans 4 columns on tablet/desktop (`min-width: 768px`) and fallback to 12 columns on mobile. This ensures clean stacking.

---

## 3. Adversarial Review: Key Failure Modes and Vulnerabilities

We identified two notable responsiveness failure modes under narrow viewport constraints (e.g. 375px):

### 🚨 Critical: `StyledHabitsGrid` Mobile Squeezing
- **File**: `frontend/src/components/areas/health/FitnessTab.tsx`
- **Vulnerability**: The habits grid is defined with a fixed 3-column layout on all viewport widths:
  ```css
  const StyledHabitsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  `;
  ```
- **Impact**: On a 375px mobile viewport, the available width for each column is `~106px`. Since `KpiCard` uses `Card` with size `lg` (which adds `24px` padding on each side, total `48px`), the actual inner content width is only `58px`. Rendering a `28px` font size value (e.g. `"3/5"`) and card header inside a `58px` space causes severe wrapping and text truncation/overflow.
- **Mitigation**: Add a media query to stack these items vertically on small screens:
  ```css
  const StyledHabitsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    @media (min-width: 640px) {
      grid-template-columns: repeat(3, 1fr);
    }
  `;
  ```

### ⚠️ Medium: `StatTile` Overflow on 375px Viewports
- **File**: `frontend/src/components/areas/finance/HomeTab.tsx`
- **Vulnerability**: The 4 KPI cards (Net Worth, Spent, Income, Savings Rate) use the `StatTile` component, which renders inside a 2-column grid (`KpiGrid`) on mobile.
- **Impact**: On a 375px screen, each card has a width of `~163.5px`. With the default `size="lg"` card padding (`24px` on each side), the inner content width is `~115px`. A standard currency string value (e.g., `"₹1,50,000.00"`) at `28px` font size (`StatValue`) will overflow the card.
- **Mitigation**: Reduce card padding on smaller viewports by using `size="sm"` or `size="md"` for mobile screens.

---

## 4. Z-index & Spacing Conflicts

- **Popover vs. Dialog**: The `Select` dropdown component renders its option surface inside a `<Portal>` container using `position: fixed` and `z-index: 1200` (`theme.zIndex.popover`). Dialogs use `z-index: 1100` (`theme.zIndex.modal`). Since `1200 > 1100`, dropdown lists correctly render over Dialog elements without getting hidden, cut off, or clipped.
- **Header Margins**: The standardized card headers have `margin-bottom: 16px` and `padding-bottom: 12px`. This matches the baseline design grid. When cards are configured with `size="none"`, the header has `$inset` padding of `16px 20px 0 20px` to keep title elements inset while allowing contents to run edge-to-edge.

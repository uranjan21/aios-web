# Scope: Responsive Layout & Build Verification (Milestone 4)

## 1. AppShell and Navigation (Mobile 375px)
- **AppShell.tsx**:
  - Add `position: relative;` to the `Root` styled component.
  - Import the `BottomNav` component from `./BottomNav`.
  - Render `<BottomNav />` inside the returned JSX (e.g., as a sibling of `<Root>` or placed at the bottom inside `<Root>`).
  - In `ContentArea` styled component, increase mobile padding bottom:
    ```typescript
    @media (max-width: 768px) {
      padding-bottom: 72px; /* Prevent the 64px BottomNav from obscuring scrollable content */
    }
    ```

## 2. WorkspaceLayout (Desktop 1440px)
- **WorkspaceLayout.tsx**:
  - Support side-by-side row layout on desktop/large screens instead of stacking sidebar rail and main content.
  - Update `Root` styled component:
    ```typescript
    @media (min-width: 1024px) {
      flex-direction: row;
      align-items: stretch;
    }
    ```
  - Update `Rail` styled component to have a fixed width on desktop/large screens:
    ```typescript
    @media (min-width: 1024px) {
      width: 280px;
    }
    ```

## 3. Sidebar Collapsible Navigation (Tablet 768px)
- **Sidebar.tsx**:
  - Ensure the sidebar behaves properly on tablet and mobile viewports.
  - Hide the collapse `ToggleButton` on mobile viewports (`max-width: 768px` or similar) so users do not toggle state inside a forced 224px drawer.
  - Ensure no horizontal overflows on any responsive screen sizes.

## 4. Build Integrity Verification
- Run `pnpm build` in the `frontend` directory and confirm it completes with exit code 0 and zero warnings/errors.

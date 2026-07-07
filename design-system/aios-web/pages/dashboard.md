# Dashboard Page Overrides

> **PROJECT:** aios-web
> **Generated:** 2026-07-06 19:21:00
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1400px or full-width
- **Grid:** 12-column grid for data flexibility
- **Layout Structure:** Bento Box Grid / Modular asymmetric cards (1x1, 2x1, 2x2) with `theme.radii.md` (10px) corners, soft shadows, clear hierarchy, neutral background, and responsive columns (4 columns on desktop -> 2 -> 1 on mobile).

### Spacing Overrides

- **Content Density:** High — optimize for information display, utilizing 12px grid gaps on analytics grids and 20px card padding. Equal-height cards per row on desktop (fixed height on layout screens) and auto-height stacked on mobile.

### Typography Overrides

- **No serif page titles:** Clean sans-serif (`DM Sans`) for all titles.
- **Hero/KPI Numerals:** `DM Sans` bold, or tabular-nums for number alignment.

### Color Overrides

- **Card Background:** White or very light gray in light mode; dark gray in dark mode. Backdrops use `backdrop-filter: blur(15px)` with solid fallbacks for low-power or non-supporting browsers.

### Component Overrides

- **Recharts Integration:** Every Recharts element must have `isAnimationActive={false}` (headless rendering requirement).
- **Tab Switched Controls:** All view switcher controls with <= 4 options must use `@ledgr/ui SegmentedControl` rather than Select dropdowns.
- **Action Toolbar:** Primary actions (such as "Add X" or log buttons) must live in a dedicated `AreaToolbar` rather than in the PageHeader itself. The PageHeader actions slot is reserved exclusively for the Settings gear.

---

## Recommendations

- **5-Second Test:** Yesterday's recap, today's outlook, and the key focal priorities must be immediately visible without scrolling.
- **Zero-Dead-Pixels Rule:** Never render an axis-only or empty chart if data is missing; dynamically replace with a descriptive `EmptyState` component containing a call-to-action button.
- **One-Hand Mobile Test:** Ensure primary interactive elements and triggers are positioned within thumb reach on mobile screens (<= 640px).

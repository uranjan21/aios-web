# @ledgr/ui

A themable, framework-agnostic React component library built with **styled-components**. No Tailwind, no shadcn, no utility classes — every visual decision lives inside one configurable theme.

## Install

```bash
npm install @ledgr/ui styled-components
```

## Quick start

```tsx
import { ThemeProvider, lightTheme, Button, Card, Input } from '@ledgr/ui';

function App() {
  return (
    <ThemeProvider theme={lightTheme}>
      <Card>
        <Input placeholder="Email" />
        <Button>Sign in</Button>
      </Card>
    </ThemeProvider>
  );
}
```

## Custom theme

Override anything by spreading the default theme:

```tsx
import { lightTheme, ThemeProvider } from '@ledgr/ui';

const brandTheme = {
  ...lightTheme,
  color: {
    ...lightTheme.color,
    primary: '#5b21b6',     // purple instead of teal
    primaryForeground: '#ffffff',
    accent: '#f59e0b',
  },
  radii: {
    ...lightTheme.radii,
    md: '4px',              // sharper corners
  },
};

<ThemeProvider theme={brandTheme}>...</ThemeProvider>
```

## Component categories

| Category | Components |
|---|---|
| **Primitives** | Button, Input, Textarea, Label, Card, Badge, Avatar, Separator, Stack, Spinner |
| **Interactive** | Select, Checkbox, Switch, Tooltip, Dialog, Sheet, Tabs, DropdownMenu, Popover |
| **Patterns** | EmptyState, PageHeader, SegmentedControl, MonthPicker, DatePicker, StatusBadge, Toast, ConfirmDialog, ErrorBoundary, AreaToolbar, Skeleton, KpiCard |
| **Layout** | AppShell, Sidebar, AppHeader, Breadcrumbs, MobileBottomNav |
| **Data** | StatCard, DataTable, KanbanBoard, ChartCard |

## Theming model

The library uses **three layers**:

1. **Primitive tokens** (`tokens.ts`) — raw values: color palettes, font stacks, spacing scale.
2. **Semantic theme** (`theme.ts`) — `primary`, `background`, `destructive`, etc. Mapped from primitives.
3. **Component styles** — consume `props.theme.color.primary`, never raw hex.

Change a primitive once → every component updates.

## Accessibility

- All interactive components meet WCAG 2.1 AA contrast at default theme.
- Focus rings are visible by default (`focus-visible`).
- Modals/sheets trap focus and restore on close.
- Icon-only buttons: `aria-label` is highly recommended for accessibility on icon-only buttons (when no `children`).
- Respects `prefers-reduced-motion`.

## License

MIT
